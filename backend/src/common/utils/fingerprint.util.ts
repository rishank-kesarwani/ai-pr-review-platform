import * as crypto from 'crypto';

export interface FingerprintInput {
  repositoryId?: string;
  repoFullName?: string;
  pullRequestNumber: number;
  file: string;
  line?: number;
  category: string;
  title: string;
}

export function generateFindingFingerprint(input: FingerprintInput): string {
  const repoKey = (input.repositoryId || input.repoFullName || 'global').toLowerCase().trim();
  const fileKey = (input.file || '').toLowerCase().trim();
  const lineKey = input.line ? input.line.toString() : '0';
  const categoryKey = (input.category || 'GENERAL').toUpperCase().trim();
  const normalizedTitle = (input.title || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 80);

  const payload = `${repoKey}:${input.pullRequestNumber}:${fileKey}:${lineKey}:${categoryKey}:${normalizedTitle}`;
  return crypto.createHash('sha256').update(payload).digest('hex');
}
