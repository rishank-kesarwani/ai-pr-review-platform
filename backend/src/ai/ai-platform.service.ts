import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import axios from 'axios';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { PromptService, PromptContext } from './prompt.service';
import { AiReviewResponseDto } from './dto/ai-review-response.dto';
import { UsageRecord, UsageRecordDocument } from '../database/schemas/usage-record.schema';
import { RawFinding } from '../analyzers/analyzer.interface';
import { AnalyzerType, FindingCategory, Severity } from '../common/enums';

@Injectable()
export class AiPlatformService {
  private readonly logger = new Logger(AiPlatformService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly promptService: PromptService,
    @InjectModel(UsageRecord.name) private usageRecordModel: Model<UsageRecordDocument>,
  ) {}

  async executeAiReview(
    context: PromptContext,
    reviewId?: Types.ObjectId,
    repositoryId?: Types.ObjectId,
    userId?: Types.ObjectId,
  ): Promise<{ summary: string; findings: RawFinding[] }> {
    const rawAiUrl = this.configService.get<string>('app.aiPlatform.url');
    const apiKey = this.configService.get<string>('app.aiPlatform.apiKey');
    const timeoutMs = this.configService.get<number>('app.aiPlatform.timeoutMs') || 60000;
    const model = this.configService.get<string>('app.aiPlatform.model') || 'gemini-1.5-pro';

    const systemPrompt = this.promptService.buildSystemPrompt();
    const userPrompt = this.promptService.buildUserPrompt(context);

    const startTime = Date.now();
    this.logger.log(`Calling AI Platform for review ${context.repoFullName}#${context.pullRequestNumber}`);

    const geminiApiKey = process.env.GEMINI_API_KEY || (apiKey?.startsWith('AIza') ? apiKey : undefined);

    let rawText: any = null;
    let usedModel = model;
    let lastErrorReason: string | undefined;

    // 1. Try primary AI Platform endpoint
    if (rawAiUrl && (!rawAiUrl.includes('localhost:4000') || !geminiApiKey)) {
      const cleanUrl = rawAiUrl.trim().replace(/\/+$/, '');
      const primaryEndpoint = cleanUrl.endsWith('/api/v1')
        ? `${cleanUrl}/ai/chat`
        : cleanUrl.includes('/api/v1/')
          ? cleanUrl
          : `${cleanUrl}/api/v1/ai/chat`;

      const payload = {
        applicationId: 'ai-pr-review-platform',
        tenantId: 'default',
        message: userPrompt,
        systemInstruction: systemPrompt,
        systemPrompt,
        model,
        temperature: 0.2,
        responseFormat: 'json',
        useRag: false,
        useMemory: false,
        cacheable: false,
      };

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (apiKey) {
        headers['x-api-key'] = apiKey;
        headers['Authorization'] = `Bearer ${apiKey}`;
      }

      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          let response;
          try {
            response = await axios.post(primaryEndpoint, payload, {
              headers,
              timeout: timeoutMs,
            });
          } catch (postErr: any) {
            if (postErr.response?.status === 404 && primaryEndpoint.includes('/api/v1/ai/chat')) {
              const fallbackEndpoint = `${cleanUrl}/ai/chat`;
              this.logger.log(`404 on ${primaryEndpoint}, retrying with ${fallbackEndpoint}`);
              response = await axios.post(fallbackEndpoint, payload, {
                headers,
                timeout: timeoutMs,
              });
            } else {
              throw postErr;
            }
          }

          rawText =
            response.data?.data?.answer ??
            response.data?.answer ??
            response.data?.reply ??
            response.data?.content ??
            response.data?.response ??
            response.data?.data ??
            response.data;
          break;
        } catch (aiPlatformErr: any) {
          const status = aiPlatformErr.response?.status;
          const errData = aiPlatformErr.response?.data;
          const errMsg = errData?.message
            ? (Array.isArray(errData.message) ? errData.message.join('; ') : errData.message)
            : aiPlatformErr.message;
          lastErrorReason = `AI Platform (HTTP ${status || 'ERR'}): ${errMsg}`;
          this.logger.warn(`AI Platform call failed (attempt ${attempt}/2): ${lastErrorReason}`);

          if (attempt < 2 && (status === 502 || status === 503 || !status)) {
            await new Promise((r) => setTimeout(r, 2000));
          } else {
            break;
          }
        }
      }
    }

    // 2. If primary AI Platform call did not produce rawText and Gemini API key is available, call Gemini directly
    if (!rawText && geminiApiKey) {
      try {
        this.logger.log(`Attempting direct Gemini API call for PR #${context.pullRequestNumber}`);
        rawText = await this.callGeminiDirectly(systemPrompt, userPrompt, geminiApiKey, model);
        usedModel = model.includes('gemini') ? model : 'gemini-1.5-flash';
      } catch (geminiErr: any) {
        lastErrorReason = `Direct Gemini API failed: ${geminiErr.message}`;
        this.logger.warn(`Direct Gemini API call failed: ${geminiErr.message}`);
      }
    }

    if (!rawText) {
      const duration = Date.now() - startTime;
      this.logger.warn(
        `AI service unreachable after ${duration}ms. Generating fallback review.`,
      );
      return this.generateFallbackReview(context, lastErrorReason || `AI Platform endpoint ${rawAiUrl} unreachable`);
    }

    try {
      const executionTimeMs = Date.now() - startTime;
      const parsedOutput = this.parseAndValidateAiJson(rawText);

      // Track usage in database
      const promptTokens = Math.round(userPrompt.length / 4);
      const completionTokens = Math.round(JSON.stringify(parsedOutput).length / 4);

      await this.usageRecordModel.create({
        userId,
        repositoryId,
        reviewId,
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
        executionTimeMs,
        model: usedModel,
        estimatedCostUsd: (promptTokens * 0.0000035) + (completionTokens * 0.0000105),
      });

      const convertedFindings: RawFinding[] = parsedOutput.findings.map((f) => ({
        file: f.file,
        line: f.line,
        endLine: f.endLine,
        category: f.category,
        severity: f.severity,
        title: f.title,
        description: f.description,
        recommendation: f.recommendation,
        evidence: f.evidence,
        confidence: f.confidence,
        source: AnalyzerType.AI,
      }));

      return {
        summary: parsedOutput.summary,
        findings: convertedFindings,
      };
    } catch (err: any) {
      this.logger.warn(`Failed to parse AI output: ${err.message}. Returning fallback.`);
      return this.generateFallbackReview(context, `Parsing failure: ${err.message}`);
    }
  }

  private async callGeminiDirectly(
    systemPrompt: string,
    userPrompt: string,
    geminiApiKey: string,
    modelName: string = 'gemini-1.5-flash',
  ): Promise<any> {
    const targetModel = modelName.includes('gemini') ? modelName : 'gemini-1.5-flash';
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${geminiApiKey}`;

    const response = await axios.post(
      endpoint,
      {
        system_instruction: {
          parts: [{ text: systemPrompt }],
        },
        contents: [
          {
            parts: [{ text: userPrompt }],
          },
        ],
        generationConfig: {
          response_mime_type: 'application/json',
          temperature: 0.2,
        },
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 60000,
      },
    );

    const candidates = response.data?.candidates;
    if (candidates && candidates.length > 0) {
      const text = candidates[0].content?.parts?.[0]?.text;
      if (text) return text;
    }
    throw new Error('No candidate content returned by Gemini API');
  }

  private parseAndValidateAiJson(raw: any): AiReviewResponseDto {
    let jsonContent: any;
    if (typeof raw === 'object' && raw !== null) {
      if (raw.summary) {
        jsonContent = raw;
      } else if (raw.data && typeof raw.data === 'object' && raw.data.summary) {
        jsonContent = raw.data;
      } else if (typeof raw.answer === 'string') {
        return this.parseAndValidateAiJson(raw.answer);
      } else if (raw.data && typeof raw.data.answer === 'string') {
        return this.parseAndValidateAiJson(raw.data.answer);
      } else {
        jsonContent = raw;
      }
    } else if (typeof raw === 'string') {
      // Clean possible Markdown code fences ```json ... ```
      let cleaned = raw.trim();
      if (cleaned.startsWith('```json')) {
        cleaned = cleaned.replace(/^```json\s*/i, '').replace(/\s*```$/, '');
      } else if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      try {
        jsonContent = JSON.parse(cleaned);
      } catch (parseErr: any) {
        this.logger.warn(`Failed to parse AI JSON response: ${parseErr.message}`);
        // Attempt relaxed regex extraction
        const match = cleaned.match(/\{[\s\S]*\}/);
        if (match) {
          jsonContent = JSON.parse(match[0]);
        } else {
          throw new Error('Could not extract JSON from AI response');
        }
      }
    } else {
      throw new Error('Invalid AI response payload');
    }

    const findingsArray = Array.isArray(jsonContent.findings)
      ? jsonContent.findings
      : [];

    const normalizedFindings = findingsArray.map((f: any) => ({
      file: f.file || 'unknown',
      line: typeof f.line === 'number' ? f.line : undefined,
      endLine: typeof f.endLine === 'number' ? f.endLine : undefined,
      severity: this.normalizeSeverity(f.severity),
      category: this.normalizeCategory(f.category),
      title: f.title || 'Code finding',
      description: f.description || '',
      recommendation: f.recommendation || '',
      evidence: f.evidence || '',
      confidence:
        typeof f.confidence === 'number' && !isNaN(f.confidence)
          ? Math.min(Math.max(f.confidence, 0), 1)
          : 0.85,
    }));

    const summary =
      typeof jsonContent.summary === 'string' && jsonContent.summary.trim()
        ? jsonContent.summary
        : 'Automated AI Pull Request Analysis completed.';

    return {
      summary,
      findings: normalizedFindings,
    };
  }

  private normalizeSeverity(val: any): Severity {
    if (!val) return Severity.MEDIUM;
    const upper = String(val).toUpperCase();
    if (Object.values(Severity).includes(upper as Severity)) {
      return upper as Severity;
    }
    return Severity.MEDIUM;
  }

  private normalizeCategory(val: any): FindingCategory {
    if (!val) return FindingCategory.BUG;
    const upper = String(val).toUpperCase();
    if (Object.values(FindingCategory).includes(upper as FindingCategory)) {
      return upper as FindingCategory;
    }
    if (upper.includes('SEC')) return FindingCategory.SECURITY;
    if (upper.includes('PERF')) return FindingCategory.PERFORMANCE;
    if (upper.includes('MAINT')) return FindingCategory.MAINTAINABILITY;
    if (upper.includes('READ')) return FindingCategory.READABILITY;
    if (upper.includes('ERR')) return FindingCategory.ERROR_HANDLING;
    if (upper.includes('EDGE')) return FindingCategory.EDGE_CASE;
    if (upper.includes('CONCUR') || upper.includes('RACE')) return FindingCategory.CONCURRENCY;
    if (upper.includes('DATA') || upper.includes('SQL')) return FindingCategory.DATABASE;
    if (upper.includes('REACT')) return FindingCategory.REACT;
    if (upper.includes('NODE')) return FindingCategory.NODEJS;
    if (upper.includes('TYPE')) return FindingCategory.TYPESCRIPT;
    if (upper.includes('TEST')) return FindingCategory.TEST_GAP;
    if (upper.includes('STYLE') || upper.includes('LINT')) return FindingCategory.STYLE;
    return FindingCategory.BUG;
  }

  private generateFallbackReview(
    context: PromptContext,
    failureReason?: string,
  ): { summary: string; findings: RawFinding[] } {
    const fileCount = context.changedFiles.length;
    const staticCount = context.staticFindings?.length || 0;

    const summary = `⚠️ AI Review Notice: AI Platform was unreachable or encountered an upstream provider error (${failureReason || 'service unavailable'}). ` +
      `Fallback evaluation completed for PR #${context.pullRequestNumber} ("${context.prTitle}"). ` +
      `Evaluated ${fileCount} changed files. ${staticCount} static analysis signals were incorporated. ` +
      `To resolve this, verify AI_PLATFORM_URL/AI_PLATFORM_PR_REVIEW_API_KEY or configure a direct GEMINI_API_KEY in your backend environment.`;

    return {
      summary,
      findings: [],
    };
  }
}
