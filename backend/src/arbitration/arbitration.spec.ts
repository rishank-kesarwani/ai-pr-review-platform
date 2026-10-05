import { DeduplicationService } from './deduplication.service';
import { ArbitrationService } from './arbitration.service';
import { Severity, FindingCategory, AnalyzerType } from '../common/enums';
import { RawFinding } from '../analyzers/analyzer.interface';

describe('Arbitration and Deduplication', () => {
  let deduplicationService: DeduplicationService;
  let arbitrationService: ArbitrationService;

  beforeEach(() => {
    deduplicationService = new DeduplicationService();
    arbitrationService = new ArbitrationService(deduplicationService);
  });

  it('should deduplicate identical findings from static analysis and AI', () => {
    const staticFindings: RawFinding[] = [
      {
        file: 'src/app.ts',
        line: 10,
        category: FindingCategory.SECURITY,
        severity: Severity.CRITICAL,
        title: 'Use of eval',
        description: 'Dangerous eval',
        recommendation: 'Remove eval',
        confidence: 0.95,
        source: AnalyzerType.ESLINT,
      },
    ];

    const aiFindings: RawFinding[] = [
      {
        file: 'src/app.ts',
        line: 10,
        category: FindingCategory.SECURITY,
        severity: Severity.CRITICAL,
        title: 'Use of eval',
        description: 'Detailed AI explanation of eval risk',
        recommendation: 'Use JSON.parse instead',
        confidence: 0.90,
        source: AnalyzerType.AI,
      },
    ];

    const { findings, severityCounts } = arbitrationService.arbitrateFindings(
      'org/repo',
      1,
      staticFindings,
      aiFindings,
    );

    expect(findings).toHaveLength(1);
    expect(findings[0].corroboratedBy).toContain(AnalyzerType.ESLINT);
    expect(findings[0].corroboratedBy).toContain(AnalyzerType.AI);
    expect(findings[0].confidence).toBeGreaterThan(0.95);
    expect(severityCounts.critical).toBe(1);
    expect(severityCounts.total).toBe(1);
  });

  it('should downgrade style findings mistakenly classified as CRITICAL by AI to LOW', () => {
    const staticFindings: RawFinding[] = [];
    const aiFindings: RawFinding[] = [
      {
        file: 'src/utils.ts',
        line: 25,
        category: FindingCategory.STYLE,
        severity: Severity.CRITICAL, // AI over-classified style
        title: 'Inconsistent Variable Naming',
        description: 'camelCase should be preferred over snake_case',
        recommendation: 'Rename my_var to myVar',
        confidence: 0.9,
        source: AnalyzerType.AI,
      },
    ];

    const { findings, severityCounts } = arbitrationService.arbitrateFindings(
      'org/repo',
      1,
      staticFindings,
      aiFindings,
    );

    expect(findings[0].severity).toBe(Severity.LOW);
    expect(severityCounts.critical).toBe(0);
    expect(severityCounts.low).toBe(1);
  });
});
