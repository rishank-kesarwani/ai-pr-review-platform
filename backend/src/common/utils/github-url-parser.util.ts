export interface ParsedGitHubPrUrl {
  owner: string;
  repo: string;
  pullNumber: number;
}

export function parseGitHubPrUrl(url: string): ParsedGitHubPrUrl | null {
  if (!url || typeof url !== 'string') {
    return null;
  }

  const cleanUrl = url.trim();
  // Match https://github.com/:owner/:repo/pull/:number (with optional trailing paths like /files, /commits)
  const regex = /^https?:\/\/(?:www\.)?github\.com\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)\/pull\/(\d+)/i;
  const match = cleanUrl.match(regex);

  if (!match) {
    return null;
  }

  const [, owner, repo, pullStr] = match;
  const pullNumber = parseInt(pullStr, 10);

  if (isNaN(pullNumber) || pullNumber <= 0) {
    return null;
  }

  return {
    owner,
    repo: repo.replace(/\.git$/, ''),
    pullNumber,
  };
}
