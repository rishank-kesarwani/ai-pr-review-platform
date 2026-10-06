export type ReviewStatus =
  | 'QUEUED'
  | 'FETCHING'
  | 'ANALYZING'
  | 'AI_REVIEW'
  | 'AGGREGATING'
  | 'PUBLISHING'
  | 'COMPLETED'
  | 'PARTIAL'
  | 'FAILED'
  | 'CANCELLED';

export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';

export type FindingCategory =
  | 'BUG'
  | 'SECURITY'
  | 'PERFORMANCE'
  | 'MAINTAINABILITY'
  | 'READABILITY'
  | 'ERROR_HANDLING'
  | 'EDGE_CASE'
  | 'API_MISUSE'
  | 'CONCURRENCY'
  | 'DATABASE'
  | 'REACT'
  | 'NODEJS'
  | 'TYPESCRIPT'
  | 'TEST_GAP'
  | 'STYLE';

export interface SeverityCounts {
  critical: number;
  high: number;
  medium: number;
  low: number;
  info: number;
  total: number;
}

export type RegressionStatus = 'NOT_RUN' | 'PASS' | 'WARN' | 'FAIL' | 'ERROR';

export interface RegressionMetricComparison {
  name: string;
  baseline: number | string;
  candidate: number | string;
  delta?: number;
  unit?: string;
  status: 'PASS' | 'WARN' | 'FAIL';
  threshold?: number;
}

export interface RegressionSummary {
  status: RegressionStatus;
  runId?: string;
  passed?: number;
  warnings?: number;
  failed?: number;
  metrics?: Record<string, { baseline: number; candidate: number; delta: number; status: string }>;
  regressions?: Array<{ metric: string; baseline: number; candidate: number; delta: number; threshold: number; message: string }>;
  timestamp?: string;
  error?: string;
}

export interface PullRequestReview {
  _id: string;
  repositoryId?: string;
  repoFullName: string;
  pullRequestNumber: number;
  prTitle: string;
  prDescription?: string;
  prUrl: string;
  author?: string;
  baseBranch: string;
  headBranch: string;
  commitSha: string;
  status: ReviewStatus;
  regressionStatus?: RegressionStatus;
  regressionDecision?: RegressionStatus;
  regressionRunId?: string;
  regressionSummary?: RegressionSummary;
  progressPercent: number;
  currentStage?: string;
  summary?: string;
  severityCounts: SeverityCounts;
  filesAnalyzed: number;
  additions: number;
  deletions: number;
  triggeredBy: string;
  isPublic: boolean;
  error?: string;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
}

export interface ReviewFinding {
  _id: string;
  reviewId: string;
  repositoryId?: string;
  repoFullName: string;
  pullRequestNumber: number;
  commitSha: string;
  file: string;
  line?: number;
  endLine?: number;
  severity: Severity;
  category: FindingCategory;
  title: string;
  description: string;
  recommendation: string;
  evidence?: string;
  confidence: number;
  source: 'ESLINT' | 'TYPESCRIPT' | 'AI' | 'SECURITY' | 'CUSTOM';
  fingerprint: string;
  isSuppressed: boolean;
  createdAt: string;
}

export interface RepositoryItem {
  _id: string;
  githubRepoId: number;
  owner: string;
  name: string;
  fullName: string;
  isPrivate: boolean;
  defaultBranch: string;
  installationId?: number;
  configuration?: {
    autoCommentEnabled: boolean;
    minCommentSeverity: Severity;
    minCommentConfidence: number;
    enabledAnalyzers: string[];
    customRules: string[];
    ignoredFiles: string[];
    maxFilesPerReview: number;
    regressionEnabled?: boolean;
    regressionBlocking?: boolean;
    regressionDataset?: string;
    regressionBaseline?: string;
    regressionPolicy?: string;
  };
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  githubUsername?: string;
  avatarUrl?: string;
  roles: string[];
}

