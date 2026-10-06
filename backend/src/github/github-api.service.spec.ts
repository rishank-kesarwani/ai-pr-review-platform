jest.mock('@octokit/auth-app', () => ({
  createAppAuth: jest.fn(),
}));
jest.mock('@octokit/rest', () => ({
  Octokit: jest.fn(),
}));

import { GitHubApiService } from './github-api.service';
import { GitHubAppService } from './github-app.service';

describe('GitHubApiService', () => {
  let apiService: GitHubApiService;
  let mockAppService: jest.Mocked<GitHubAppService>;
  let mockOctokit: any;

  beforeEach(() => {
    mockOctokit = {
      rest: {
        pulls: {
          get: jest.fn(),
          listFiles: jest.fn(),
        },
        checks: {
          create: jest.fn(),
          update: jest.fn(),
        },
        issues: {
          createComment: jest.fn(),
        },
      },
    };

    mockAppService = {
      isConfigured: jest.fn().mockReturnValue(true),
      getAppOctokit: jest.fn().mockReturnValue(mockOctokit),
      getInstallationOctokit: jest.fn().mockResolvedValue(mockOctokit),
    } as any;

    apiService = new GitHubApiService(mockAppService);
  });

  it('should fetch PR details successfully via Octokit', async () => {
    mockOctokit.rest.pulls.get.mockResolvedValueOnce({
      data: {
        id: 100,
        number: 42,
        title: 'New Feature',
        body: 'Description',
        html_url: 'https://github.com/owner/repo/pull/42',
        user: { login: 'octocat' },
        base: { ref: 'main', repo: { private: false } },
        head: { ref: 'feat', sha: 'sha123' },
        additions: 20,
        deletions: 5,
        changed_files: 2,
      },
    });

    const pr = await apiService.getPullRequest('owner', 'repo', 42, 123);
    expect(pr.number).toBe(42);
    expect(pr.headSha).toBe('sha123');
    expect(mockAppService.getInstallationOctokit).toHaveBeenCalledWith(123);
  });

  it('should handle GitHub API failure gracefully when PR is not found or API throws', async () => {
    mockOctokit.rest.pulls.get.mockRejectedValueOnce({
      status: 404,
      message: 'Not Found',
    });

    await expect(
      apiService.getPullRequest('owner', 'repo', 999, 123),
    ).rejects.toThrow('Pull request owner/repo#999 not found or is private');
  });

  it('should handle installation token authentication failure', async () => {
    mockAppService.getInstallationOctokit.mockRejectedValueOnce(
      new Error('HttpError: Bad credentials or installation suspended'),
    );

    await expect(
      apiService.getPullRequest('owner', 'repo', 42, 999),
    ).rejects.toThrow('Bad credentials or installation suspended');
  });

  it('should create check run on GitHub and return checkRunId', async () => {
    mockOctokit.rest.checks.create.mockResolvedValueOnce({
      data: { id: 777001 },
    });

    const checkRunId = await apiService.createCheckRun('owner', 'repo', 'sha123', 123);
    expect(checkRunId).toBe(777001);
    expect(mockOctokit.rest.checks.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'AI Code Review',
        head_sha: 'sha123',
        status: 'in_progress',
      }),
    );
  });
});
