import { Injectable, Logger } from '@nestjs/common';
import { CodeAnalyzer, AnalysisContext, RawFinding } from './analyzer.interface';
import { AnalyzerType, FindingCategory, Severity } from '../common/enums';
import { parseDiffPatch } from '../common/utils/diff-parser.util';

@Injectable()
export class TypeScriptAnalyzer implements CodeAnalyzer {
  readonly name = AnalyzerType.TYPESCRIPT;
  private readonly logger = new Logger(TypeScriptAnalyzer.name);

  canAnalyze(filename: string): boolean {
    return /\.(ts|tsx)$/i.test(filename);
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

        // 1. Explicit `any` type usage
        if (/:\s*any\b/.test(lineContent) || /as\s+any\b/.test(lineContent)) {
          findings.push({
            file: file.filename,
            line,
            category: FindingCategory.TYPESCRIPT,
            severity: Severity.MEDIUM,
            title: 'Use of `any` Type Bypasses TypeScript Safety',
            description: 'Using `any` disables compile-time type checking, hiding potential runtime crashes and signature mismatches.',
            recommendation: 'Replace `any` with a strongly-typed interface, generic type, or `unknown` with runtime type narrowing.',
            evidence: lineContent.trim(),
            confidence: 0.94,
            source: AnalyzerType.TYPESCRIPT,
          });
        }

        // 2. Unsafe Non-null assertion operator (!)
        if (/[a-zA-Z0-9_)]!\./.test(lineContent) || /[a-zA-Z0-9_)]!\[/.test(lineContent)) {
          findings.push({
            file: file.filename,
            line,
            category: FindingCategory.BUG,
            severity: Severity.LOW,
            title: 'Unsafe Non-Null Assertion (`!`)',
            description: 'Non-null assertion forces TypeScript to assume the value is never null/undefined, risking runtime TypeError if the assumption fails.',
            recommendation: 'Use optional chaining (`?.`) or add explicit null checking / guard statements.',
            evidence: lineContent.trim(),
            confidence: 0.85,
            source: AnalyzerType.TYPESCRIPT,
          });
        }

        // 3. Floating Promise without await or catch
        if (
          /(?:fetch|axios\.[a-z]+|prisma\.[a-z]+|save|update)\([^)]*\)/i.test(lineContent) &&
          !/await\s+/i.test(lineContent) &&
          !/return\s+/i.test(lineContent) &&
          !/\.(?:then|catch|finally)/i.test(lineContent)
        ) {
          findings.push({
            file: file.filename,
            line,
            category: FindingCategory.ERROR_HANDLING,
            severity: Severity.HIGH,
            title: 'Unhandled Async Promise / Floating Promise',
            description: 'An asynchronous operation is invoked without `await` or `.catch()`, which can lead to unhandled promise rejections and silent failures.',
            recommendation: 'Add `await` to the call, return the promise, or attach an explicit `.catch()` error handler.',
            evidence: lineContent.trim(),
            confidence: 0.88,
            source: AnalyzerType.TYPESCRIPT,
          });
        }

        // 4. @ts-ignore without explanation
        if (/@ts-ignore/.test(lineContent)) {
          findings.push({
            file: file.filename,
            line,
            category: FindingCategory.TYPESCRIPT,
            severity: Severity.LOW,
            title: 'Suppression of Type Errors via `@ts-ignore`',
            description: '`@ts-ignore` suppresses compiler diagnostics without type checking.',
            recommendation: 'Use `@ts-expect-error` with an explanatory comment, or fix the underlying type mismatch.',
            evidence: lineContent.trim(),
            confidence: 0.96,
            source: AnalyzerType.TYPESCRIPT,
          });
        }
      }
    }

    return findings;
  }
}
