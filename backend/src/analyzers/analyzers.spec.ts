import { ESLintAnalyzer } from './eslint.analyzer';
import { TypeScriptAnalyzer } from './typescript.analyzer';
import { Severity, FindingCategory, AnalyzerType } from '../common/enums';

describe('Static Analyzers', () => {
  describe('ESLintAnalyzer', () => {
    let analyzer: ESLintAnalyzer;

    beforeEach(() => {
      analyzer = new ESLintAnalyzer();
    });

    it('should detect eval() execution in patch diff', async () => {
      const findings = await analyzer.analyze({
        repoFullName: 'test/repo',
        pullRequestNumber: 1,
        commitSha: 'sha123',
        changedFiles: [
          {
            filename: 'src/calculator.js',
            status: 'modified',
            additions: 1,
            deletions: 0,
            changes: 1,
            validLines: [15],
            patch: '@@ -14,1 +14,2 @@\n const a = 1;\n+const res = eval("2 + 2");',
          },
        ],
      });

      expect(findings.length).toBeGreaterThan(0);
      const evalFinding = findings.find((f) => f.category === FindingCategory.SECURITY);
      expect(evalFinding).toBeDefined();
      expect(evalFinding?.severity).toBe(Severity.CRITICAL);
      expect(evalFinding?.source).toBe(AnalyzerType.ESLINT);
    });

    it('should detect console.log in non-test files', async () => {
      const findings = await analyzer.analyze({
        repoFullName: 'test/repo',
        pullRequestNumber: 1,
        commitSha: 'sha123',
        changedFiles: [
          {
            filename: 'src/main.ts',
            status: 'modified',
            additions: 1,
            deletions: 0,
            changes: 1,
            validLines: [5],
            patch: '@@ -4,1 +4,2 @@\n+console.log("Debugging user token", token);',
          },
        ],
      });

      const logFinding = findings.find((f) => f.category === FindingCategory.MAINTAINABILITY);
      expect(logFinding).toBeDefined();
      expect(logFinding?.severity).toBe(Severity.INFO);
    });
  });

  describe('TypeScriptAnalyzer', () => {
    let analyzer: TypeScriptAnalyzer;

    beforeEach(() => {
      analyzer = new TypeScriptAnalyzer();
    });

    it('should detect explicit `any` type annotations', async () => {
      const findings = await analyzer.analyze({
        repoFullName: 'test/repo',
        pullRequestNumber: 1,
        commitSha: 'sha123',
        changedFiles: [
          {
            filename: 'src/service.ts',
            status: 'modified',
            additions: 1,
            deletions: 0,
            changes: 1,
            validLines: [20],
            patch: '@@ -19,1 +19,2 @@\n+function processData(payload: any): any {',
          },
        ],
      });

      expect(findings.length).toBeGreaterThan(0);
      const anyFinding = findings.find((f) => f.category === FindingCategory.TYPESCRIPT);
      expect(anyFinding).toBeDefined();
      expect(anyFinding?.severity).toBe(Severity.MEDIUM);
    });

    it('should detect floating promises without await', async () => {
      const findings = await analyzer.analyze({
        repoFullName: 'test/repo',
        pullRequestNumber: 1,
        commitSha: 'sha123',
        changedFiles: [
          {
            filename: 'src/handler.ts',
            status: 'modified',
            additions: 1,
            deletions: 0,
            changes: 1,
            validLines: [10],
            patch: '@@ -9,1 +9,2 @@\n+axios.post("/api/sync", payload);',
          },
        ],
      });

      const promiseFinding = findings.find((f) => f.category === FindingCategory.ERROR_HANDLING);
      expect(promiseFinding).toBeDefined();
      expect(promiseFinding?.severity).toBe(Severity.HIGH);
    });
  });
});
