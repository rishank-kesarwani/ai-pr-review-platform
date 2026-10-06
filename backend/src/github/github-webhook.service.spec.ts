jest.mock('@octokit/auth-app', () => ({
  createAppAuth: jest.fn(),
}));
jest.mock('@octokit/rest', () => ({
  Octokit: jest.fn(),
}));

import { GitHubWebhookService } from './github-webhook.service';

describe('GitHubWebhookService', () => {
  let service: GitHubWebhookService;
  let mockWebhookEventModel: any;
  let mockInstallationModel: any;
  let mockRepoModel: any;
  let mockReviewsService: any;

  beforeEach(() => {
    mockWebhookEventModel = {
      findOne: jest.fn(),
      create: jest.fn().mockResolvedValue({}),
    };

    mockInstallationModel = {
      findOneAndUpdate: jest.fn().mockResolvedValue({}),
    };

    mockRepoModel = {
      findOne: jest.fn(),
      create: jest.fn().mockResolvedValue({ _id: 'repo-123' }),
    };

    mockReviewsService = {
      enqueueReview: jest.fn().mockResolvedValue({ reviewId: 'rev-456' }),
    };

    service = new GitHubWebhookService(
      mockWebhookEventModel,
      mockInstallationModel,
      mockRepoModel,
      mockReviewsService,
    );
  });

  it('should acknowledge ping events', async () => {
    const result = await service.handleWebhook('ping', 'del-1', { zen: 'Keep it simple' });
    expect(result.status).toBe('acknowledged');
    expect(result.message).toBe('Pong received');
  });

  it('should ignore unsupported webhook events', async () => {
    const result = await service.handleWebhook('star', 'del-2', { action: 'created' });
    expect(result.status).toBe('ignored');
    expect(result.message).toContain('not handled');
  });

  it('should ignore unsupported PR actions (e.g. labeled, closed)', async () => {
    const payload = {
      action: 'labeled',
      pull_request: { number: 1 },
      repository: { full_name: 'owner/repo' },
    };
    const result = await service.handleWebhook('pull_request', 'del-3', payload);
    expect(result.status).toBe('ignored');
  });

  it('should ignore draft pull requests unless ready_for_review', async () => {
    const payload = {
      action: 'opened',
      pull_request: { number: 1, draft: true },
      repository: { full_name: 'owner/repo' },
    };
    const result = await service.handleWebhook('pull_request', 'del-4', payload);
    expect(result.status).toBe('ignored');
    expect(result.message).toContain('Draft PRs are skipped');
  });

  it('should ignore duplicate webhook deliveries based on idempotency key', async () => {
    mockWebhookEventModel.findOne.mockResolvedValueOnce({ eventId: 'gh:owner/repo:42:sha123:opened' });

    const payload = {
      action: 'opened',
      pull_request: { number: 42, head: { sha: 'sha123' } },
      repository: { full_name: 'owner/repo' },
    };

    const result = await service.handleWebhook('pull_request', 'del-5', payload);
    expect(result.status).toBe('duplicate_ignored');
    expect(mockReviewsService.enqueueReview).not.toHaveBeenCalled();
  });

  it('should enqueue review on valid pull request opened event', async () => {
    mockWebhookEventModel.findOne.mockResolvedValueOnce(null);
    mockRepoModel.findOne.mockResolvedValueOnce(null);

    const payload = {
      action: 'opened',
      pull_request: {
        id: 999,
        number: 42,
        title: 'Fix memory leak',
        body: 'Fixes #10',
        html_url: 'https://github.com/owner/repo/pull/42',
        user: { login: 'octocat' },
        base: { ref: 'main' },
        head: { ref: 'patch-1', sha: 'sha123' },
        private: false,
        additions: 10,
        deletions: 2,
        changed_files: 3,
        draft: false,
      },
      repository: {
        id: 12345,
        name: 'repo',
        full_name: 'owner/repo',
        owner: { login: 'owner' },
        private: false,
        default_branch: 'main',
      },
      installation: { id: 888 },
      sender: { login: 'octocat' },
    };

    const result = await service.handleWebhook('pull_request', 'del-6', payload);

    expect(result.status).toBe('enqueued');
    expect(mockWebhookEventModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        eventId: 'gh:owner/repo:42:sha123:opened',
        eventType: 'pull_request',
        eventAction: 'opened',
      }),
    );
    expect(mockReviewsService.enqueueReview).toHaveBeenCalledWith(
      expect.objectContaining({
        prUrl: 'https://github.com/owner/repo/pull/42',
        triggeredBy: 'WEBHOOK',
        installationId: 888,
      }),
    );
  });

  it('should process installation created and deleted events', async () => {
    const installPayload = {
      action: 'created',
      installation: {
        id: 101,
        account: { login: 'org', type: 'Organization', avatar_url: 'http://avatar' },
        repository_selection: 'all',
        permissions: { pull_requests: 'write' },
      },
    };

    const result = await service.handleWebhook('installation', 'del-7', installPayload);
    expect(result.status).toBe('acknowledged');
    expect(mockInstallationModel.findOneAndUpdate).toHaveBeenCalledWith(
      { installationId: 101 },
      expect.objectContaining({ isActive: true }),
      { upsert: true, new: true },
    );

    const deletePayload = {
      action: 'deleted',
      installation: { id: 101 },
    };

    await service.handleWebhook('installation', 'del-8', deletePayload);
    expect(mockInstallationModel.findOneAndUpdate).toHaveBeenCalledWith(
      { installationId: 101 },
      { isActive: false },
    );
  });
});
