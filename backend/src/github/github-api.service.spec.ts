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
        base: { ref: 'main', repo: { owner: { login: 'owner' }, name: 'repo', full_name: 'owner/repo', private: false } },
        head: { ref: 'feat', sha: 'sha123', repo: { owner: { login: 'owner' }, name: 'repo', full_name: 'owner/repo' } },
        additions: 20,
        deletions: 5,
        changed_files: 2,
      },
    });

    const pr = await apiService.getPullRequest('owner', 'repo', 42, 123);
    expect(pr.number).toBe(42);
    expect(pr.headSha).toBe('sha123');
    expect(pr.isFork).toBe(false);
    expect(mockAppService.getInstallationOctokit).toHaveBeenCalledWith(123);
  });

  it('should fetch public PR with fork metadata without installation token', async () => {
    mockOctokit.rest.pulls.get.mockResolvedValueOnce({
      data: {
        id: 200,
        number: 13,
        title: 'Add system design docs',
        body: 'Improves architecture diagram',
        html_url: 'https://github.com/karanpratapsingh/system-design/pull/13',
        user: { login: 'vbeskrovnov' },
        base: {
          ref: 'master',
          repo: {
            owner: { login: 'karanpratapsingh' },
            name: 'system-design',
            full_name: 'karanpratapsingh/system-design',
            private: false,
          },
        },
        head: {
          ref: 'patch-1',
          sha: 'forksha789',
          repo: {
            owner: { login: 'vbeskrovnov' },
            name: 'system-design',
            full_name: 'vbeskrovnov/system-design',
            fork: true,
          },
        },
        additions: 15,
        deletions: 2,
        changed_files: 1,
      },
    });

    const pr = await apiService.getPullRequest('karanpratapsingh', 'system-design', 13, undefined);
    expect(pr.number).toBe(13);
    expect(pr.baseOwner).toBe('karanpratapsingh');
    expect(pr.headOwner).toBe('vbeskrovnov');
    expect(pr.isFork).toBe(true);
    expect(mockAppService.getAppOctokit).toHaveBeenCalled();
  });

  it('should handle GitHub API failure gracefully when PR is private or not found', async () => {
    mockOctokit.rest.pulls.get.mockRejectedValueOnce({
      status: 404,
      message: 'Not Found',
    });

    await expect(
      apiService.getPullRequest('owner', 'repo', 999, 123),
    ).rejects.toThrow('This Pull Request is private or requires GitHub authorization');
  });

  it('should handle GitHub API rate limit (403)', async () => {
    mockOctokit.rest.pulls.get.mockRejectedValueOnce({
      status: 403,
      message: 'API rate limit exceeded',
    });

    await expect(
      apiService.getPullRequest('owner', 'repo', 42, undefined),
    ).rejects.toThrow('GitHub API rate limit exceeded');
  });

  it('should handle installation token authentication failure', async () => {
    mockAppService.getInstallationOctokit.mockRejectedValueOnce(
      new Error('HttpError: Bad credentials or installation suspended'),
    );

    await expect(
      apiService.getPullRequest('owner', 'repo', 42, 999),
    ).rejects.toThrow('Bad credentials or installation suspended');
  });

  it('should create check run on GitHub when installation exists', async () => {
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

  it('should not create check run or post comments if installationId is missing (public read-only)', async () => {
    const checkRunId = await apiService.createCheckRun('owner', 'repo', 'sha123', undefined);
    expect(checkRunId).toBeUndefined();
    expect(mockOctokit.rest.checks.create).not.toHaveBeenCalled();

    await apiService.postPullRequestComment('owner', 'repo', 42, 'Review summary', undefined);
    expect(mockOctokit.rest.issues.createComment).not.toHaveBeenCalled();
  });
});
