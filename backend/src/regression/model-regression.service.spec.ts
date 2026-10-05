import { ModelRegressionService } from './model-regression.service';
import { RegressionStatus } from '../common/enums';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('ModelRegressionService', () => {
  let service: ModelRegressionService;
  let mockConfigService: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockConfigService = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'app.modelRegression.url') return 'http://localhost:5000';
        if (key === 'app.modelRegression.apiKey') return 'mock-regression-api-key';
        if (key === 'app.modelRegression.timeoutMs') return 5000;
        if (key === 'app.aiPlatform.model') return 'gemini-1.5-pro';
        if (key === 'app.modelRegression.defaultDatasetId') return 'pr-review-evaluation';
        if (key === 'app.modelRegression.defaultBaselineId') return 'pr-review-baseline-v1';
        return null;
      }),
    };

    service = new ModelRegressionService(mockConfigService);
  });

  it('should return PASS when regression check meets all quality criteria', async () => {
    mockedAxios.post.mockResolvedValueOnce({
      data: {
        status: 'PASS',
        runId: 'reg-run-101',
        summary: { passed: 10, warnings: 0, failed: 0 },
        metrics: {
          quality: { current: 0.94, baseline: 0.92, delta: 0.02 },
          latency: { current: 2.1, baseline: 2.3, delta: -0.2 },
        },
        regressions: [],
      },
    });

    const result = await service.checkRegression({
      reviewId: 'review-1',
      repository: 'facebook/react',
      pullRequest: 100,
      commitSha: 'abc1234',
    });

    expect(result.status).toBe(RegressionStatus.PASS);
    expect(result.runId).toBe('reg-run-101');
    expect(result.summary?.passed).toBe(10);
    expect(mockedAxios.post).toHaveBeenCalledTimes(1);
    expect(mockedAxios.post).toHaveBeenCalledWith(
      'http://localhost:5000/api/v1/regression/check',
      expect.objectContaining({
        project: 'ai-pr-review-platform',
        datasetId: 'pr-review-evaluation',
      }),
      expect.objectContaining({
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'mock-regression-api-key',
        },
      }),
    );
  });

  it('should return WARN when minor metric degradation is reported', async () => {
    mockedAxios.post.mockResolvedValueOnce({
      data: {
        status: 'WARN',
        runId: 'reg-run-102',
        summary: { passed: 9, warnings: 1, failed: 0 },
        regressions: [
          {
            metric: 'latency',
            severity: 'WARN',
            message: 'Latency increased by +12% compared to baseline',
          },
        ],
      },
    });

    const result = await service.checkRegression({
      reviewId: 'review-2',
      repository: 'facebook/react',
      pullRequest: 101,
    });

    expect(result.status).toBe(RegressionStatus.WARN);
    expect(result.summary?.warnings).toBe(1);
  });

  it('should return FAIL when severe accuracy or quality regression occurs', async () => {
    mockedAxios.post.mockResolvedValueOnce({
      data: {
        status: 'FAIL',
        runId: 'reg-run-103',
        summary: { passed: 6, warnings: 1, failed: 3 },
        regressions: [
          {
            metric: 'finding_precision',
            severity: 'CRITICAL',
            message: 'Finding precision dropped below acceptance threshold',
          },
        ],
      },
    });

    const result = await service.checkRegression({
      reviewId: 'review-3',
      repository: 'facebook/react',
      pullRequest: 102,
    });

    expect(result.status).toBe(RegressionStatus.FAIL);
    expect(result.summary?.failed).toBe(3);
    expect(result.regressions?.length).toBe(1);
  });

  it('should not retry on 401 Unauthorized client errors', async () => {
    const error: any = new Error('Request failed with status code 401');
    error.response = { status: 401, data: { message: 'Invalid API Key' } };
    mockedAxios.isAxiosError.mockReturnValue(true);
    mockedAxios.post.mockRejectedValue(error);

    const result = await service.checkRegression({
      reviewId: 'review-4',
    });

    expect(result.status).toBe(RegressionStatus.ERROR);
    expect(mockedAxios.post).toHaveBeenCalledTimes(1); // No retries for 401
  });

  it('should retry transient 503 error and succeed on second attempt', async () => {
    const error503: any = new Error('Service Unavailable');
    error503.response = { status: 503 };
    mockedAxios.isAxiosError.mockReturnValue(true);

    mockedAxios.post
      .mockRejectedValueOnce(error503)
      .mockResolvedValueOnce({
        data: {
          status: 'PASS',
          runId: 'reg-run-retry-ok',
          summary: { passed: 5, warnings: 0, failed: 0 },
        },
      });

    const result = await service.checkRegression({
      reviewId: 'review-5',
    });

    expect(result.status).toBe(RegressionStatus.PASS);
    expect(result.runId).toBe('reg-run-retry-ok');
    expect(mockedAxios.post).toHaveBeenCalledTimes(2);
  });

  it('should return ERROR gracefully on network timeout without throwing exception', async () => {
    const timeoutError: any = new Error('timeout of 5000ms exceeded');
    mockedAxios.isAxiosError.mockReturnValue(true);
    mockedAxios.post.mockRejectedValue(timeoutError);

    const result = await service.checkRegression({
      reviewId: 'review-6',
    });

    expect(result.status).toBe(RegressionStatus.ERROR);
    expect(result.error).toBeDefined();
  });
});
