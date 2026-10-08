import { parseGitHubPrUrl } from './github-url-parser.util';
import { generateFindingFingerprint } from './fingerprint.util';
import { parseDiffPatch } from './diff-parser.util';
import { normalizeApiUrl } from './api-url.util';

describe('Common Utilities', () => {
  describe('parseGitHubPrUrl', () => {
    it('should parse standard GitHub pull request URL', () => {
      const url = 'https://github.com/facebook/react/pull/12345';
      const result = parseGitHubPrUrl(url);
      expect(result).toEqual({
        owner: 'facebook',
        repo: 'react',
        pullNumber: 12345,
        canonicalUrl: 'https://github.com/facebook/react/pull/12345',
      });
    });

    it('should parse specific target public repository PR (e.g. karanpratapsingh/system-design/pull/13)', () => {
      const url = 'https://github.com/karanpratapsingh/system-design/pull/13';
      const result = parseGitHubPrUrl(url);
      expect(result).toEqual({
        owner: 'karanpratapsingh',
        repo: 'system-design',
        pullNumber: 13,
        canonicalUrl: 'https://github.com/karanpratapsingh/system-design/pull/13',
      });
    });

    it('should parse URL with trailing /files or /commits', () => {
      const url = 'https://github.com/vercel/next.js/pull/9999/files';
      const result = parseGitHubPrUrl(url);
      expect(result).toEqual({
        owner: 'vercel',
        repo: 'next.js',
        pullNumber: 9999,
        canonicalUrl: 'https://github.com/vercel/next.js/pull/9999',
      });
    });

    it('should reject issues URLs', () => {
      expect(parseGitHubPrUrl('https://github.com/facebook/react/issues/123')).toBeNull();
    });

    it('should reject commit URLs', () => {
      expect(parseGitHubPrUrl('https://github.com/facebook/react/commit/abcdef123456')).toBeNull();
    });

    it('should reject non-GitHub domains', () => {
      expect(parseGitHubPrUrl('https://gitlab.com/owner/repo/pull/123')).toBeNull();
      expect(parseGitHubPrUrl('https://attacker.com/owner/repo/pull/123')).toBeNull();
    });

    it('should reject javascript and data URLs', () => {
      expect(parseGitHubPrUrl('javascript:alert(1)')).toBeNull();
      expect(parseGitHubPrUrl('data:text/html,<html></html>')).toBeNull();
    });

    it('should reject path traversal attempts', () => {
      expect(parseGitHubPrUrl('https://github.com/owner/../repo/pull/123')).toBeNull();
      expect(parseGitHubPrUrl('https://github.com/%2e%2e/repo/pull/123')).toBeNull();
    });

    it('should reject malformed or non-positive PR numbers', () => {
      expect(parseGitHubPrUrl('https://github.com/owner/repo/pull/0')).toBeNull();
      expect(parseGitHubPrUrl('https://github.com/owner/repo/pull/-5')).toBeNull();
      expect(parseGitHubPrUrl('https://github.com/owner/repo/pull/abc')).toBeNull();
      expect(parseGitHubPrUrl('')).toBeNull();
    });
  });

  describe('generateFindingFingerprint', () => {
    it('should generate identical fingerprints for identical finding parameters', () => {
      const input1 = {
        repoFullName: 'facebook/react',
        pullRequestNumber: 100,
        file: 'src/index.ts',
        line: 42,
        category: 'SECURITY',
        title: 'Use of Dangerous eval()',
      };
      const input2 = { ...input1 };

      const fp1 = generateFindingFingerprint(input1);
      const fp2 = generateFindingFingerprint(input2);

      expect(fp1).toBe(fp2);
      expect(fp1).toHaveLength(64); // SHA256 hex
    });

    it('should generate different fingerprints for different files or lines', () => {
      const fp1 = generateFindingFingerprint({
        repoFullName: 'facebook/react',
        pullRequestNumber: 100,
        file: 'src/a.ts',
        line: 10,
        category: 'BUG',
        title: 'Memory leak',
      });
      const fp2 = generateFindingFingerprint({
        repoFullName: 'facebook/react',
        pullRequestNumber: 100,
        file: 'src/b.ts',
        line: 10,
        category: 'BUG',
        title: 'Memory leak',
      });

      expect(fp1).not.toBe(fp2);
    });
  });

  describe('parseDiffPatch', () => {
    it('should extract valid added line numbers from unified diff patch', () => {
      const patch = `@@ -1,4 +1,6 @@
 import React from 'react';
+import { useState } from 'react';
+import { useEffect } from 'react';
 
 export function App() {`;

      const { validLines, hunks } = parseDiffPatch(patch);
      expect(validLines).toContain(2);
      expect(validLines).toContain(3);
      expect(hunks.filter((h) => h.type === 'add')).toHaveLength(2);
    });
  });

  describe('normalizeApiUrl', () => {
    it('should prevent duplicated /api/v1', () => {
      const base = 'https://api.example.com/api/v1';
      const path = '/api/v1/reviews';
      expect(normalizeApiUrl(base, path)).toBe('https://api.example.com/api/v1/reviews');
    });

    it('should append path cleanly with single slash', () => {
      const base = 'https://api.example.com';
      const path = 'health';
      expect(normalizeApiUrl(base, path)).toBe('https://api.example.com/health');
    });
  });
});
