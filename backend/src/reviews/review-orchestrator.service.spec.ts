jest.mock('@octokit/auth-app', () => ({
  createAppAuth: jest.fn(),
}));
jest.mock('@octokit/rest', () => ({
  Octokit: jest.fn(),
}));

import { ReviewOrchestratorService } from './review-orchestrator.service';
import { RegressionStatus, ReviewStatus } from '../common/enums';

describe('ReviewOrchestratorService - Regression & Quality Gates', () => {
  let orchestrator: ReviewOrchestratorService;
  let mockReviewModel: any;
  let mockJobModel: any;
  let mockFindingModel: any;
  let mockConfigModel: any;
  let mockRepoModel: any;
  let mockGithubApi: any;
  let mockAnalyzersService: any;
  let mockAiPlatformService: any;
  let mockArbitrationService: any;
  let mockNotificationsService: any;
  let mockModelRegressionService: any;
  let mockConfigService: any;

  beforeEach(() => {
    mockReviewModel = {
      findById: jest.fn().mockResolvedValue({
        _id: 'rev-001',
        repositoryId: 'repo-001',
        repoFullName: 'owner/repo',
        pullRequestNumber: 10,
        prUrl: 'https://github.com/owner/repo/pull/10',
        save: jest.fn(),
      }),
      findByIdAndUpdate: jest.fn().mockResolvedValue({}),
    };

    mockJobModel = {
      findOne: jest.fn().mockResolvedValue({
        _id: 'job-001',
        jobId: 'bull-job-1',
        reviewId: 'rev-001',
        isCancelled: false,
        logs: [],
        save: jest.fn().mockResolvedValue({}),
      }),
    };

    mockFindingModel = {
      deleteMany: jest.fn().mockResolvedValue({}),
      insertMany: jest.fn().mockResolvedValue([]),
    };

    mockConfigModel = {
      findOne: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      }),
    };

    mockRepoModel = {
      findById: jest.fn().mockResolvedValue({
        _id: 'repo-001',
        fullName: 'owner/repo',
        installationId: 9999,
        configuration: {
          regressionEnabled: true,
          regressionBlocking: false,
        },
      }),
    };

    mockGithubApi = {
      createCheckRun: jest.fn().mockResolvedValue(12345),
      updateCheckRun: jest.fn().mockResolvedValue({}),
      getPullRequest: jest.fn().mockResolvedValue({
        id: 1,
        number: 10,
        title: 'PR Title',
        author: 'octocat',
        baseBranch: 'main',
        headBranch: 'feature',
        headSha: 'sha999',
        isPrivate: false,
        htmlUrl: 'https://github.com/owner/repo/pull/10',
        additions: 10,
        deletions: 2,
        changedFilesCount: 1,
      }),
      getPullRequestFiles: jest.fn().mockResolvedValue([
        { filename: 'file.ts', status: 'modified', patch: '@@ -1 +1 @@', validLines: [1] },
      ]),
      postPullRequestComment: jest.fn().mockResolvedValue({}),
    };

    mockAnalyzersService = {
      runStaticAnalysis: jest.fn().mockResolvedValue([]),
    };

    mockAiPlatformService = {
      executeAiReview: jest.fn().mockResolvedValue({
        summary: 'Review completed cleanly',
        findings: [],
      }),
    };

    mockArbitrationService = {
      arbitrateFindings: jest.fn().mockReturnValue({
        findings: [],
        severityCounts: { critical: 0, high: 0, medium: 0, low: 0, info: 0, total: 0 },
      }),
    };

    mockNotificationsService = {
      sendNotification: jest.fn().mockResolvedValue({}),
    };

    mockModelRegressionService = {
      checkRegression: jest.fn().mockResolvedValue({
        status: RegressionStatus.PASS,
        runId: 'reg-run-pass',
        summary: { passed: 5, warnings: 0, failed: 0 },
      }),
    };

    mockConfigService = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'app.modelRegression.checkMode') return 'review';
        if (key === 'app.modelRegression.blocking') return false;
        if (key === 'app.github.autoCommentEnabled') return false;
        return null;
      }),
    };

    orchestrator = new ReviewOrchestratorService(
      mockReviewModel,
      mockJobModel,
      mockFindingModel,
      mockConfigModel,
      mockRepoModel,
      mockGithubApi,
      mockAnalyzersService,
      mockAiPlatformService,
      mockArbitrationService,
      mockNotificationsService,
      mockModelRegressionService,
      mockConfigService,
    );
  });

  it('should continue review and set conclusion to success when regression is FAIL and blocking=false', async () => {
    mockModelRegressionService.checkRegression.mockResolvedValueOnce({
      status: RegressionStatus.FAIL,
      runId: 'reg-fail-run',
      summary: { passed: 2, warnings: 0, failed: 3 },
    });

    await orchestrator.processReview('bull-job-1');

    expect(mockGithubApi.updateCheckRun).toHaveBeenCalledWith(
      'owner',
      'repo',
      12345,
      'success', // Not failed because blocking is false and no critical/high findings
      expect.any(String),
      expect.any(Array),
      9999,
    );
  });

  it('should mark check run as failure when regression is FAIL and blocking=true', async () => {
    mockRepoModel.findById.mockResolvedValueOnce({
      _id: 'repo-001',
      fullName: 'owner/repo',
      installationId: 9999,
      configuration: {
        regressionEnabled: true,
        regressionBlocking: true, // blocking enabled!
      },
    });

    mockModelRegressionService.checkRegression.mockResolvedValueOnce({
      status: RegressionStatus.FAIL,
      runId: 'reg-fail-run-block',
      summary: { passed: 2, warnings: 0, failed: 3 },
    });

    await orchestrator.processReview('bull-job-1');

    expect(mockGithubApi.updateCheckRun).toHaveBeenCalledWith(
      'owner',
      'repo',
      12345,
      'failure', // Fails check run due to blocking regression
      expect.any(String),
      expect.any(Array),
      9999,
    );

    expect(mockNotificationsService.sendNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'regression.failed',
      }),
    );
  });

  it('should gracefully degrade with regressionStatus ERROR and complete review when regression service throws', async () => {
    mockModelRegressionService.checkRegression.mockRejectedValueOnce(
      new Error('Model Regression Service Outage (503 Service Unavailable)'),
    );

    await orchestrator.processReview('bull-job-1');

    expect(mockReviewModel.findByIdAndUpdate).toHaveBeenCalledWith(
      'rev-001',
      expect.objectContaining({
        regressionStatus: RegressionStatus.ERROR,
      }),
    );
    expect(mockReviewModel.findByIdAndUpdate).toHaveBeenCalledWith(
      'rev-001',
      expect.objectContaining({
        status: ReviewStatus.COMPLETED,
      }),
    );
  });

  it('should not create check run or post comment for public PR without GitHub App installation', async () => {
    // Review without repositoryId / installationId
    mockReviewModel.findById.mockResolvedValueOnce({
      _id: 'rev-public-001',
      repositoryId: undefined,
      repoFullName: 'karanpratapsingh/system-design',
      pullRequestNumber: 13,
      prUrl: 'https://github.com/karanpratapsingh/system-design/pull/13',
    });

    mockRepoModel.findById.mockResolvedValueOnce(null);

    mockGithubApi.getPullRequest.mockResolvedValueOnce({
      id: 200,
      number: 13,
      title: 'Update system design',
      author: 'vbeskrovnov',
      baseOwner: 'karanpratapsingh',
      baseRepo: 'system-design',
      baseBranch: 'master',
      headOwner: 'vbeskrovnov',
      headRepo: 'system-design',
      headBranch: 'patch-1',
      headSha: 'fork-sha-123',
      isFork: true,
      isPrivate: false,
      htmlUrl: 'https://github.com/karanpratapsingh/system-design/pull/13',
      additions: 10,
      deletions: 2,
      changedFilesCount: 1,
    });

    await orchestrator.processReview('bull-job-1');

    // Verify Check Run was NOT created
    expect(mockGithubApi.createCheckRun).not.toHaveBeenCalled();
    expect(mockGithubApi.updateCheckRun).not.toHaveBeenCalled();
    expect(mockGithubApi.postPullRequestComment).not.toHaveBeenCalled();

    // Verify fork metadata and public mode was persisted
    expect(mockReviewModel.findByIdAndUpdate).toHaveBeenCalledWith(
      'rev-public-001',
      expect.objectContaining({
        baseOwner: 'karanpratapsingh',
        baseRepo: 'system-design',
        headOwner: 'vbeskrovnov',
        headRepo: 'system-design',
        isFork: true,
        reviewSource: 'PUBLIC_PR_URL',
        githubWriteAccess: false,
      }),
    );

    // Verify review completed successfully
    expect(mockReviewModel.findByIdAndUpdate).toHaveBeenCalledWith(
      'rev-public-001',
      expect.objectContaining({
        status: ReviewStatus.COMPLETED,
      }),
    );
  });
});
