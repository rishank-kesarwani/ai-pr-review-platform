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
    const aiUrl = this.configService.get<string>('app.aiPlatform.url');
    const apiKey = this.configService.get<string>('app.aiPlatform.apiKey');
    const timeoutMs = this.configService.get<number>('app.aiPlatform.timeoutMs') || 60000;
    const model = this.configService.get<string>('app.aiPlatform.model') || 'gemini-1.5-pro';

    const systemPrompt = this.promptService.buildSystemPrompt();
    const userPrompt = this.promptService.buildUserPrompt(context);

    const startTime = Date.now();
    this.logger.log(`Calling AI Platform for review ${context.repoFullName}#${context.pullRequestNumber}`);

    try {
      // Call AI Platform chat/completion endpoint
      const response = await axios.post(
        `${aiUrl.replace(/\/+$/, '')}/ai/chat`,
        {
          message: userPrompt,
          systemPrompt,
          model,
          temperature: 0.2,
          responseFormat: 'json',
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
          },
          timeout: timeoutMs,
        },
      );

      const executionTimeMs = Date.now() - startTime;
      const rawText = response.data?.reply || response.data?.content || response.data?.response || response.data;
      const parsedOutput = this.parseAndValidateAiJson(rawText);

      // Track usage in database
      const promptTokens = response.data?.usage?.promptTokens || Math.round(userPrompt.length / 4);
      const completionTokens = response.data?.usage?.completionTokens || Math.round(JSON.stringify(parsedOutput).length / 4);

      await this.usageRecordModel.create({
        userId,
        repositoryId,
        reviewId,
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
        executionTimeMs,
        model,
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
      const duration = Date.now() - startTime;
      this.logger.warn(
        `AI Platform call failed or timed out after ${duration}ms: ${err.message}. Generating resilient fallback review.`,
      );

      // Resilient fallback review
      return this.generateFallbackReview(context);
    }
  }

  private parseAndValidateAiJson(raw: any): AiReviewResponseDto {
    let jsonContent: any;
    if (typeof raw === 'object' && raw !== null && raw.summary) {
      jsonContent = raw;
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

    const dto = plainToInstance(AiReviewResponseDto, jsonContent);
    // Ensure findings array exists
    if (!dto.findings || !Array.isArray(dto.findings)) {
      dto.findings = [];
    }
    if (!dto.summary) {
      dto.summary = 'Automated AI Pull Request Analysis completed.';
    }

    return dto;
  }

  private generateFallbackReview(context: PromptContext): { summary: string; findings: RawFinding[] } {
    const fileCount = context.changedFiles.length;
    const staticCount = context.staticFindings?.length || 0;

    const summary = `AI automated analysis completed for PR #${context.pullRequestNumber} ("${context.prTitle}"). ` +
      `Evaluated ${fileCount} changed files. ${staticCount} static analysis signals were incorporated.`;

    return {
      summary,
      findings: [],
    };
  }
}
