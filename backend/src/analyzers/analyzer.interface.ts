import { Severity, FindingCategory, AnalyzerType } from '../common/enums';
import { PrFileChange } from '../github/github-api.service';

export interface RawFinding {
  file: string;
  line?: number;
  endLine?: number;
  category: FindingCategory;
  severity: Severity;
  title: string;
  description: string;
  recommendation: string;
  evidence?: string;
  confidence: number;
  source: AnalyzerType;
}

export interface AnalysisContext {
  repoFullName: string;
  pullRequestNumber: number;
  commitSha: string;
  changedFiles: PrFileChange[];
  customRules?: string[];
}

export interface CodeAnalyzer {
  readonly name: AnalyzerType;
  canAnalyze(filename: string): boolean;
  analyze(context: AnalysisContext): Promise<RawFinding[]>;
}
