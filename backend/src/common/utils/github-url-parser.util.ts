export interface ParsedGitHubPrUrl {
  owner: string;
  repo: string;
  pullNumber: number;
  canonicalUrl: string;
}

/**
 * Hardened GitHub PR URL parser.
 * Strictly accepts canonical GitHub Pull Request URLs:
 * https://github.com/owner/repo/pull/123
 *
 * Rejects:
 * - issues URLs (/issues/123)
 * - commit URLs (/commit/abc)
 * - arbitrary external domains
 * - malformed PR numbers (<= 0, NaN)
 * - javascript/data URLs
 * - path traversal (..)
 */
export function parseGitHubPrUrl(url: string): ParsedGitHubPrUrl | null {
  if (!url || typeof url !== 'string') {
    return null;
  }

  const trimmed = url.trim();

  // Basic security check against traversal and forbidden protocols
  if (
    trimmed.includes('..') ||
    trimmed.includes('%2e%2e') ||
    trimmed.includes('%2E%2E') ||
    /^(?:javascript|data|file|vbscript):/i.test(trimmed)
  ) {
    return null;
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(trimmed);
  } catch {
    return null;
  }

  // Enforce http/https and github.com host
  if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') {
    return null;
  }

  const host = parsedUrl.hostname.toLowerCase();
  if (host !== 'github.com' && host !== 'www.github.com') {
    return null;
  }

  // Canonical GitHub PR path regex: /owner/repo/pull/123 (with optional trailing slash, /files, /commits)
  // Owner and repo can only contain alphanumeric characters, hyphens, underscores, and dots.
  const pathRegex = /^\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)\/pull\/([1-9][0-9]*)(?:\/(?:files|commits)?)?\/?$/;
  const match = parsedUrl.pathname.match(pathRegex);

  if (!match) {
    return null;
  }

  const [, rawOwner, rawRepo, pullStr] = match;

  // Reject invalid owner/repo names
  if (
    rawOwner === '.' ||
    rawOwner === '..' ||
    rawRepo === '.' ||
    rawRepo === '..' ||
    rawOwner.startsWith('.') ||
    rawRepo.startsWith('.')
  ) {
    return null;
  }

  const cleanRepo = rawRepo.replace(/\.git$/, '');
  const pullNumber = parseInt(pullStr, 10);

  if (isNaN(pullNumber) || pullNumber <= 0 || !Number.isSafeInteger(pullNumber)) {
    return null;
  }

  return {
    owner: rawOwner,
    repo: cleanRepo,
    pullNumber,
    canonicalUrl: `https://github.com/${rawOwner}/${cleanRepo}/pull/${pullNumber}`,
  };
}

