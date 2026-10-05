import { Injectable, Logger } from '@nestjs/common';
import { RawFinding } from '../analyzers/analyzer.interface';
import { generateFindingFingerprint } from '../common/utils/fingerprint.util';

export interface ProcessedFinding extends RawFinding {
  fingerprint: string;
  corroboratedBy?: string[];
}

@Injectable()
export class DeduplicationService {
  private readonly logger = new Logger(DeduplicationService.name);

  deduplicateFindings(
    repoFullName: string,
    pullRequestNumber: number,
    findings: RawFinding[],
  ): ProcessedFinding[] {
    const findingMap = new Map<string, ProcessedFinding>();

    for (const finding of findings) {
      const fingerprint = generateFindingFingerprint({
        repoFullName,
        pullRequestNumber,
        file: finding.file,
        line: finding.line,
        category: finding.category,
        title: finding.title,
      });

      if (findingMap.has(fingerprint)) {
        const existing = findingMap.get(fingerprint)!;
        // Boost confidence when both static analysis and AI confirm the same issue
        existing.confidence = Math.min(1.0, existing.confidence + 0.15);
        if (!existing.corroboratedBy) {
          existing.corroboratedBy = [existing.source];
        }
        if (!existing.corroboratedBy.includes(finding.source)) {
          existing.corroboratedBy.push(finding.source);
        }
        // Retain more detailed evidence/recommendation if available
        if (finding.description.length > existing.description.length) {
          existing.description = finding.description;
        }
        if (finding.recommendation.length > existing.recommendation.length) {
          existing.recommendation = finding.recommendation;
        }
      } else {
        findingMap.set(fingerprint, {
          ...finding,
          fingerprint,
          corroboratedBy: [finding.source],
        });
      }
    }

    const result = Array.from(findingMap.values());
    this.logger.log(
      `Deduplicated ${findings.length} raw findings down to ${result.length} unique findings`,
    );
    return result;
  }
}
