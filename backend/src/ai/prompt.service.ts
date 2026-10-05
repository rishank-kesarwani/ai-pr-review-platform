import { Injectable } from '@nestjs/common';
import { RawFinding } from '../analyzers/analyzer.interface';
import { PrFileChange } from '../github/github-api.service';

export interface PromptContext {
  repoFullName: string;
  pullRequestNumber: number;
  prTitle: string;
  prDescription: string;
  author: string;
  baseBranch: string;
  headBranch: string;
  changedFiles: PrFileChange[];
  staticFindings: RawFinding[];
  customRules?: string[];
}

@Injectable()
export class PromptService {
  buildSystemPrompt(): string {
    return `You are a Senior Principal Software Engineer and Automated Code Reviewer.
Your goal is to conduct an authoritative, thorough, and high-precision code review of a GitHub Pull Request.

Key Review Dimensions:
1. Correctness & Logic Bugs (off-by-one errors, state synchronization, edge cases)
2. Security Vulnerabilities (injection, XSS, SSRF, secret leakage, auth flaws, prototype pollution)
3. Performance & Resource Management (N+1 queries, memory leaks, unindexed operations, blocking async loop)
4. Maintainability & Architecture (modularity, coupling, SOLID principles, anti-patterns)
5. Error Handling & Resilience (unhandled exceptions, floating promises, silent failures)
6. Concurrency & Race Conditions (distributed locks, shared state mutations)
7. Framework Specifics (React hook rules, re-render traps, NestJS DI scoping, Node.js streams)
8. TypeScript & Type Safety (unwarranted \`any\` casts, unsound assertions)

Hallucination & Evidence Rules:
- ONLY flag issues that are directly evidenced in the provided git diff or changed lines.
- Do NOT invent or speculate about unprovided files.
- NEVER categorize stylistic preferences (formatting, naming taste) as HIGH or CRITICAL severity.
- If code is clean and has no issues, return an empty findings array.
- Provide clear explanation, exact line numbers, and actionable concrete recommendations.

Output Format:
You MUST respond with a strictly valid JSON object matching this schema:
{
  "summary": "Executive summary of the PR, key changes, strengths, and primary concerns",
  "findings": [
    {
      "file": "path/to/file.ts",
      "line": 42,
      "endLine": 45,
      "severity": "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO",
      "category": "BUG" | "SECURITY" | "PERFORMANCE" | "MAINTAINABILITY" | "READABILITY" | "ERROR_HANDLING" | "EDGE_CASE" | "API_MISUSE" | "CONCURRENCY" | "DATABASE" | "REACT" | "NODEJS" | "TYPESCRIPT" | "TEST_GAP" | "STYLE",
      "title": "Clear concise summary of the issue",
      "description": "Deep technical explanation of why this is an issue and its runtime impact",
      "recommendation": "Concrete refactored code example or step-by-step fix",
      "evidence": "Quoted exact snippet from the diff proving the finding",
      "confidence": 0.95
    }
  ]
}`;
  }

  buildUserPrompt(context: PromptContext, maxDiffTokens: number = 32000): string {
    const {
      repoFullName,
      pullRequestNumber,
      prTitle,
      prDescription,
      author,
      baseBranch,
      headBranch,
      changedFiles,
      staticFindings,
      customRules,
    } = context;

    let diffText = '';
    let totalLength = 0;
    const maxChars = maxDiffTokens * 4; // Approx 4 chars per token

    for (const file of changedFiles) {
      if (!file.patch) continue;
      const fileHeader = `\n--- File: ${file.filename} (${file.status}) ---\n`;
      const content = fileHeader + file.patch;

      if (totalLength + content.length > maxChars) {
        diffText += `\n[Diff truncated: Exceeded size limit for AI context window. ${changedFiles.length} files total]`;
        break;
      }

      diffText += content;
      totalLength += content.length;
    }

    let staticAnalysisSummary = 'None detected';
    if (staticFindings && staticFindings.length > 0) {
      staticAnalysisSummary = staticFindings
        .map(
          (f) =>
            `- [${f.source}] ${f.file}:${f.line || '?'} (${f.severity}/${f.category}): ${f.title}`,
        )
        .join('\n');
    }

    let customRulesSection = '';
    if (customRules && customRules.length > 0) {
      customRulesSection = `\n### Repository Custom Review Rules:\n${customRules.map((r, i) => `${i + 1}. ${r}`).join('\n')}\n`;
    }

    return `Please review the following GitHub Pull Request:

## Repository: ${repoFullName}
## PR Number: #${pullRequestNumber}
## Title: ${prTitle}
## Author: @${author}
## Target: ${baseBranch} <- Source: ${headBranch}

### Description:
${prDescription || 'No description provided.'}
${customRulesSection}
### Pre-computed Static Analysis Findings:
${staticAnalysisSummary}

### Pull Request Unified Diff:
\`\`\`diff
${diffText}
\`\`\`

Analyze the changes thoroughly and produce the required structured JSON review.`;
  }
}
