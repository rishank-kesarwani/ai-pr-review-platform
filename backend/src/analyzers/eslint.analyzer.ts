import { Injectable, Logger } from '@nestjs/common';
import { CodeAnalyzer, AnalysisContext, RawFinding } from './analyzer.interface';
import { AnalyzerType, FindingCategory, Severity } from '../common/enums';
import { parseDiffPatch } from '../common/utils/diff-parser.util';

@Injectable()
export class ESLintAnalyzer implements CodeAnalyzer {
  readonly name = AnalyzerType.ESLINT;
  private readonly logger = new Logger(ESLintAnalyzer.name);

  canAnalyze(filename: string): boolean {
    return /\.(js|jsx|ts|tsx|mjs|cjs)$/i.test(filename);
  }

  async analyze(context: AnalysisContext): Promise<RawFinding[]> {
    const findings: RawFinding[] = [];

    for (const file of context.changedFiles) {
      if (!this.canAnalyze(file.filename) || !file.patch) {
        continue;
      }

      const { hunks } = parseDiffPatch(file.patch);

      for (const hunk of hunks) {
        if (hunk.type !== 'add' || !hunk.newLineNumber) continue;

        const lineContent = hunk.content;
        const line = hunk.newLineNumber;

        // 1. Insecure eval or Function constructor
        if (/\beval\s*\(/.test(lineContent) || /new\s+Function\s*\(/.test(lineContent)) {
          findings.push({
            file: file.filename,
            line,
            category: FindingCategory.SECURITY,
            severity: Severity.CRITICAL,
            title: 'Use of Dangerous `eval()` or Dynamic Code Execution',
            description: 'Dynamic code execution via `eval` or `Function` allows arbitrary code execution and introduces severe security vulnerabilities.',
            recommendation: 'Replace `eval()` with safe JSON parsing, structured lookups, or explicit functions.',
            evidence: lineContent.trim(),
            confidence: 0.98,
            source: AnalyzerType.ESLINT,
          });
        }

        // 2. innerHTML / dangerouslySetInnerHTML without sanitization
        if (/innerHTML\s*=/.test(lineContent) || /dangerouslySetInnerHTML/.test(lineContent)) {
          findings.push({
            file: file.filename,
            line,
            category: FindingCategory.SECURITY,
            severity: Severity.HIGH,
            title: 'Potential Cross-Site Scripting (XSS) via Unsanitized HTML Insertion',
            description: 'Directly assigning to `innerHTML` or using `dangerouslySetInnerHTML` can allow attacker-controlled scripts to execute.',
            recommendation: 'Use standard text bindings or sanitize inputs using DOMPurify before rendering raw HTML.',
            evidence: lineContent.trim(),
            confidence: 0.92,
            source: AnalyzerType.ESLINT,
          });
        }

        // 3. Hardcoded credentials / secret patterns
        if (
          /(?:password|secret|api[_-]?key|jwt[_-]?secret|private[_-]?key)\s*[:=]\s*['"`][a-zA-Z0-9_\-.~+/=]{8,}['"`]/i.test(
            lineContent,
          ) &&
          !/process\.env|configService|dummy|example|placeholder/i.test(lineContent)
        ) {
          findings.push({
            file: file.filename,
            line,
            category: FindingCategory.SECURITY,
            severity: Severity.CRITICAL,
            title: 'Potential Hardcoded Secret or API Key Detected',
            description: 'Possible hardcoded secret or token detected in source code. Credentials should never be committed into version control.',
            recommendation: 'Move secrets to environment variables and access them via process.env or secret managers.',
            evidence: '[REDACTED SECRET EVIDENCE]',
            confidence: 0.88,
            source: AnalyzerType.ESLINT,
          });
        }

        // 4. Console log in production code
        if (/console\.(log|debug|trace)\s*\(/.test(lineContent) && !file.filename.includes('test')) {
          findings.push({
            file: file.filename,
            line,
            category: FindingCategory.MAINTAINABILITY,
            severity: Severity.INFO,
            title: 'Console Log Statement in Production Code',
            description: 'Direct `console.log` statements can cause performance overhead and leak debugging info in production.',
            recommendation: 'Use a structured logger (e.g. NestJS Logger, Winston) or remove debug logs.',
            evidence: lineContent.trim(),
            confidence: 0.95,
            source: AnalyzerType.ESLINT,
          });
        }

        // 5. Loose equality check
        if (/[^!=]==[^=]/.test(lineContent) || /[^!]!=[^=]/.test(lineContent)) {
          findings.push({
            file: file.filename,
            line,
            category: FindingCategory.BUG,
            severity: Severity.LOW,
            title: 'Use of Loose Equality (`==` or `!=`)',
            description: 'Loose equality operators perform unexpected type coercion and can introduce subtle bugs.',
            recommendation: 'Use strict equality (`===` or `!==`) to ensure type safety.',
            evidence: lineContent.trim(),
            confidence: 0.90,
            source: AnalyzerType.ESLINT,
          });
        }
      }
    }

    return findings;
  }
}
