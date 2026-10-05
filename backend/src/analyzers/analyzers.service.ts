import { Injectable, Logger } from '@nestjs/common';
import { CodeAnalyzer, AnalysisContext, RawFinding } from './analyzer.interface';
import { ESLintAnalyzer } from './eslint.analyzer';
import { TypeScriptAnalyzer } from './typescript.analyzer';

@Injectable()
export class AnalyzersService {
  private readonly logger = new Logger(AnalyzersService.name);
  private readonly analyzers: CodeAnalyzer[] = [];

  constructor(
    private readonly eslintAnalyzer: ESLintAnalyzer,
    private readonly typescriptAnalyzer: TypeScriptAnalyzer,
  ) {
    this.registerAnalyzer(eslintAnalyzer);
    this.registerAnalyzer(typescriptAnalyzer);
  }

  registerAnalyzer(analyzer: CodeAnalyzer) {
    this.analyzers.push(analyzer);
  }

  async runStaticAnalysis(
    context: AnalysisContext,
    enabledAnalyzers?: string[],
  ): Promise<RawFinding[]> {
    const allFindings: RawFinding[] = [];
    const activeAnalyzers = this.analyzers.filter((analyzer) => {
      if (!enabledAnalyzers || enabledAnalyzers.length === 0) return true;
      return enabledAnalyzers.includes(analyzer.name);
    });

    this.logger.log(
      `Running ${activeAnalyzers.length} static analyzers on PR ${context.repoFullName}#${context.pullRequestNumber}`,
    );

    for (const analyzer of activeAnalyzers) {
      try {
        const startTime = Date.now();
        const findings = await analyzer.analyze(context);
        const duration = Date.now() - startTime;
        this.logger.log(
          `Analyzer [${analyzer.name}] completed in ${duration}ms with ${findings.length} findings`,
        );
        allFindings.push(...findings);
      } catch (err: any) {
        this.logger.error(
          `Static analyzer [${analyzer.name}] failed: ${err.message}`,
          err.stack,
        );
        // Do not crash the entire review pipeline on single analyzer failure
      }
    }

    return allFindings;
  }
}
