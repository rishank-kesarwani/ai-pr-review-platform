import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError } from 'axios';
import { RegressionStatus } from '../common/enums';
import { RegressionCheckRequestDto, RegressionCheckResponseDto } from './dto/regression.dto';

export interface RegressionEvaluationContext {
  reviewId?: string;
  repository?: string;
  pullRequest?: number;
  commitSha?: string;
  model?: string;
  promptVersion?: string;
  datasetId?: string;
  baselineId?: string;
}

@Injectable()
export class ModelRegressionService {
  private readonly logger = new Logger(ModelRegressionService.name);

  constructor(private readonly configService: ConfigService) {}

  async checkRegression(
    context: RegressionEvaluationContext,
    customRequest?: Partial<RegressionCheckRequestDto>,
  ): Promise<RegressionCheckResponseDto> {
    const baseUrl = this.configService.get<string>('app.modelRegression.url') || 'http://localhost:5000';
    const apiKey = this.configService.get<string>('app.modelRegression.apiKey') || '';
    const timeoutMs = this.configService.get<number>('app.modelRegression.timeoutMs') || 10000;
    const defaultModel = this.configService.get<string>('app.aiPlatform.model') || 'gemini-1.5-pro';
    const defaultDataset = this.configService.get<string>('app.modelRegression.defaultDatasetId') || 'pr-review-evaluation';
    const defaultBaseline = this.configService.get<string>('app.modelRegression.defaultBaselineId') || 'pr-review-baseline-v1';

    const payload: RegressionCheckRequestDto = {
      project: 'ai-pr-review-platform',
      version: '1.0.0',
      datasetId: customRequest?.datasetId || context.datasetId || defaultDataset,
      datasetVersion: customRequest?.datasetVersion || '1.0.0',
      model: customRequest?.model || context.model || defaultModel,
      promptVersion: customRequest?.promptVersion || context.promptVersion || 'v1.0.0',
      baselineId: customRequest?.baselineId || context.baselineId || defaultBaseline,
      metrics: customRequest?.metrics || [
        'quality',
        'latency',
        'cost',
        'structured_output_validity',
        'finding_precision',
        'finding_recall',
      ],
    };

    const endpoint = `${baseUrl.replace(/\/+$/, '')}/api/v1/regression/check`;
    const startTime = Date.now();

    this.logger.log(
      `Dispatching Model Regression Check for PR ${context.repository || 'unknown'}#${context.pullRequest || 0} ` +
      `[Model: ${payload.model}, Baseline: ${payload.baselineId}, Dataset: ${payload.datasetId}]`,
    );

    const maxRetries = 2;
    let attempt = 0;

    while (attempt <= maxRetries) {
      attempt++;
      try {
        const response = await axios.post<RegressionCheckResponseDto>(endpoint, payload, {
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
          },
          timeout: timeoutMs,
        });

        const duration = Date.now() - startTime;
        const result = response.data;
        const validStatuses = Object.values(RegressionStatus);
        const normalizedStatus = validStatuses.includes(result.status as any)
          ? (result.status as RegressionStatus)
          : RegressionStatus.NOT_RUN;

        this.logger.log(
          `[Observability] Regression check completed in ${duration}ms: ` +
          `Status=${normalizedStatus}, RunId=${result.runId || 'N/A'}, ` +
          `ReviewId=${context.reviewId || 'N/A'}, Repo=${context.repository || 'N/A'}#${context.pullRequest || 'N/A'}`,
        );

        return {
          status: normalizedStatus,
          runId: result.runId,
          summary: result.summary || { passed: 0, warnings: 0, failed: 0 },
          metrics: result.metrics || {},
          regressions: result.regressions || [],
        };
      } catch (err: any) {
        const duration = Date.now() - startTime;
        const isAxiosError = axios.isAxiosError(err);
        const statusCode = isAxiosError ? err.response?.status : undefined;
        const isClientError = statusCode && statusCode >= 400 && statusCode < 500;

        // Do not retry 400, 401, 403 or if max attempts reached
        if (isClientError || attempt > maxRetries) {
          this.logger.warn(
            `[Observability] Model Regression Check failed after ${duration}ms (Attempt ${attempt}/${maxRetries + 1}): ` +
            `Error=${err.message}, StatusCode=${statusCode || 'N/A'}, ` +
            `ReviewId=${context.reviewId || 'N/A'}, Repo=${context.repository || 'N/A'}`,
          );

          return {
            status: RegressionStatus.ERROR,
            error: isAxiosError && err.response?.data?.message
              ? err.response.data.message
              : err.message || 'Model Regression Detection service unreachable',
            summary: { passed: 0, warnings: 0, failed: 0 },
            metrics: {},
            regressions: [],
          };
        }

        const backoffMs = attempt * 1000;
        this.logger.warn(
          `Transient error contacting Model Regression service (${err.message}). Retrying in ${backoffMs}ms...`,
        );
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      }
    }

    return {
      status: RegressionStatus.ERROR,
      error: 'Model Regression Check exceeded retry attempts',
      summary: { passed: 0, warnings: 0, failed: 0 },
      metrics: {},
      regressions: [],
    };
  }
}
