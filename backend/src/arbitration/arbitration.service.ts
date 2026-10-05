import { Injectable, Logger } from '@nestjs/common';
import { RawFinding } from '../analyzers/analyzer.interface';
import { DeduplicationService, ProcessedFinding } from './deduplication.service';
import { Severity, FindingCategory } from '../common/enums';

@Injectable()
export class ArbitrationService {
  private readonly logger = new Logger(ArbitrationService.name);

  constructor(private readonly deduplicationService: DeduplicationService) {}

  arbitrateFindings(
    repoFullName: string,
    pullRequestNumber: number,
    staticFindings: RawFinding[],
    aiFindings: RawFinding[],
  ): {
    findings: ProcessedFinding[];
    severityCounts: { critical: number; high: number; medium: number; low: number; info: number; total: number };
  } {
    const rawCombined = [...staticFindings, ...aiFindings];
    const deduplicated = this.deduplicationService.deduplicateFindings(
      repoFullName,
      pullRequestNumber,
      rawCombined,
    );

    // Apply Arbitration & Calibration Rules
    const calibratedFindings = deduplicated.map((finding) => {
      let severity = finding.severity;

      // Rule 1: Style issues must never be CRITICAL or HIGH
      if (
        finding.category === FindingCategory.STYLE ||
        finding.category === FindingCategory.READABILITY
      ) {
        if (severity === Severity.CRITICAL || severity === Severity.HIGH) {
          severity = Severity.LOW;
        }
      }

      // Rule 2: Low confidence findings cannot be CRITICAL
      if (finding.confidence < 0.7 && severity === Severity.CRITICAL) {
        severity = Severity.HIGH;
      }

      // Rule 3: High confidence security findings stay CRITICAL/HIGH
      if (finding.category === FindingCategory.SECURITY && finding.confidence >= 0.85) {
        if (severity !== Severity.CRITICAL && severity !== Severity.HIGH) {
          severity = Severity.HIGH;
        }
      }

      return {
        ...finding,
        severity,
      };
    });

    // Sort by severity (CRITICAL -> HIGH -> MEDIUM -> LOW -> INFO) and confidence desc
    const severityOrder: Record<Severity, number> = {
      [Severity.CRITICAL]: 0,
      [Severity.HIGH]: 1,
      [Severity.MEDIUM]: 2,
      [Severity.LOW]: 3,
      [Severity.INFO]: 4,
    };

    calibratedFindings.sort((a, b) => {
      const orderDiff = severityOrder[a.severity] - severityOrder[b.severity];
      if (orderDiff !== 0) return orderDiff;
      return b.confidence - a.confidence;
    });

    const severityCounts = {
      critical: calibratedFindings.filter((f) => f.severity === Severity.CRITICAL).length,
      high: calibratedFindings.filter((f) => f.severity === Severity.HIGH).length,
      medium: calibratedFindings.filter((f) => f.severity === Severity.MEDIUM).length,
      low: calibratedFindings.filter((f) => f.severity === Severity.LOW).length,
      info: calibratedFindings.filter((f) => f.severity === Severity.INFO).length,
      total: calibratedFindings.length,
    };

    this.logger.log(
      `Arbitration completed: ${severityCounts.total} total findings (Critical: ${severityCounts.critical}, High: ${severityCounts.high}, Medium: ${severityCounts.medium}, Low: ${severityCounts.low}, Info: ${severityCounts.info})`,
    );

    return {
      findings: calibratedFindings,
      severityCounts,
    };
  }
}
