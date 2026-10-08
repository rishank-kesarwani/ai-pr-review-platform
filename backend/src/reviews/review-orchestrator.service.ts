import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { PullRequestReview, PullRequestReviewDocument } from '../database/schemas/pull-request-review.schema';
import { ReviewJob, ReviewJobDocument } from '../database/schemas/review-job.schema';
import { ReviewFinding, ReviewFindingDocument } from '../database/schemas/review-finding.schema';
import { ReviewConfiguration, ReviewConfigurationDocument } from '../database/schemas/review-configuration.schema';
import { Repository, RepositoryDocument } from '../database/schemas/repository.schema';
import { GitHubApiService } from '../github/github-api.service';
import { AnalyzersService } from '../analyzers/analyzers.service';
import { AiPlatformService } from '../ai/ai-platform.service';
import { ArbitrationService } from '../arbitration/arbitration.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ModelRegressionService } from '../regression/model-regression.service';
import { parseGitHubPrUrl } from '../common/utils/github-url-parser.util';
import { ReviewStatus, JobStatus, Severity, RegressionStatus } from '../common/enums';

@Injectable()
export class ReviewOrchestratorService {
  private readonly logger = new Logger(ReviewOrchestratorService.name);

  constructor(
    @InjectModel(PullRequestReview.name) private reviewModel: Model<PullRequestReviewDocument>,
    @InjectModel(ReviewJob.name) private jobModel: Model<ReviewJobDocument>,
    @InjectModel(ReviewFinding.name) private findingModel: Model<ReviewFindingDocument>,
    @InjectModel(ReviewConfiguration.name) private configModel: Model<ReviewConfigurationDocument>,
    @InjectModel(Repository.name) private repoModel: Model<RepositoryDocument>,
    private readonly githubApi: GitHubApiService,
    private readonly analyzersService: AnalyzersService,
    private readonly aiPlatformService: AiPlatformService,
    private readonly arbitrationService: ArbitrationService,
    private readonly notificationsService: NotificationsService,
    private readonly modelRegressionService: ModelRegressionService,
    private readonly configService: ConfigService,
  ) {}

  async processReview(jobId: string): Promise<void> {
    const job = await this.jobModel.findOne({ jobId });
    if (!job) {
      this.logger.error(`Job ${jobId} not found in database`);
      return;
    }

    if (job.isCancelled) {
      this.logger.log(`Job ${jobId} was cancelled before starting`);
      await this.updateJobStatus(job, JobStatus.CANCELLED, 'Job cancelled by user');
      await this.reviewModel.findByIdAndUpdate(job.reviewId, { status: ReviewStatus.CANCELLED });
      return;
    }

    const review = await this.reviewModel.findById(job.reviewId);
    if (!review) {
      this.logger.error(`Review ${job.reviewId} associated with job ${jobId} not found`);
      return;
    }

    const startTime = Date.now();
    this.logger.log(`Starting PR Review Pipeline for Review #${review._id} (${review.repoFullName}#${review.pullRequestNumber})`);

    try {
      await this.updateJobStatus(job, JobStatus.PROCESSING, 'Starting PR analysis pipeline');
      await this.updateReviewStage(review, ReviewStatus.FETCHING, 10, 'Fetching Pull Request details from GitHub');

      // STAGE 1: FETCH PR METADATA & CHANGED FILES
      const parsed = parseGitHubPrUrl(review.prUrl);
      if (!parsed) {
        throw new Error(`Invalid PR URL: ${review.prUrl}`);
      }

      // Find installation ID and repo configuration if repository is registered
      let repoDoc: any = null;
      let installationId: number | undefined;
      if (review.repositoryId) {
        repoDoc = await this.repoModel.findById(review.repositoryId);
        installationId = repoDoc?.installationId;
      }

      const explicitConfig = await this.configModel.findOne({ repositoryId: review.repositoryId }).lean();
      const repoConfig = explicitConfig || repoDoc?.configuration;
      const maxFiles = repoConfig?.maxFilesPerReview || this.configService.get<number>('app.reviewLimits.maxFiles') || 50;

      const [prDetails, prFiles] = await Promise.all([
        this.githubApi.getPullRequest(parsed.owner, parsed.repo, parsed.pullNumber, installationId),
        this.githubApi.getPullRequestFiles(parsed.owner, parsed.repo, parsed.pullNumber, maxFiles, installationId),
      ]);

      // Create GitHub Check Run if installation exists
      let checkRunId: number | undefined;
      if (installationId) {
        checkRunId = await this.githubApi.createCheckRun(parsed.owner, parsed.repo, prDetails.headSha, installationId);
        if (checkRunId) {
          await this.reviewModel.findByIdAndUpdate(review._id, { checkRunId });
        }
      }

      // Update PR metadata on review record
      await this.reviewModel.findByIdAndUpdate(review._id, {
        prTitle: prDetails.title,
        prDescription: prDetails.description,
        author: prDetails.author,
        baseOwner: prDetails.baseOwner,
        baseRepo: prDetails.baseRepo,
        baseBranch: prDetails.baseBranch,
        headOwner: prDetails.headOwner,
        headRepo: prDetails.headRepo,
        headBranch: prDetails.headBranch,
        commitSha: prDetails.headSha,
        isFork: prDetails.isFork,
        reviewSource: installationId ? 'GITHUB_APP' : 'PUBLIC_PR_URL',
        githubWriteAccess: Boolean(installationId),
        additions: prDetails.additions,
        deletions: prDetails.deletions,
        filesAnalyzed: prFiles.length,
      });

      // Cancellation check
      if (await this.isJobCancelled(jobId)) return;

      // STAGE 2: STATIC CODE ANALYSIS
      await this.updateReviewStage(review, ReviewStatus.ANALYZING, 35, 'Running static analysis rules and AST checks');
      const staticFindings = await this.analyzersService.runStaticAnalysis(
        {
          repoFullName: review.repoFullName,
          pullRequestNumber: review.pullRequestNumber,
          commitSha: prDetails.headSha,
          changedFiles: prFiles,
          customRules: repoConfig?.customRules,
        },
        repoConfig?.enabledAnalyzers,
      );

      // Cancellation check
      if (await this.isJobCancelled(jobId)) return;

      // STAGE 3: AI-POWERED CODE REVIEW
      await this.updateReviewStage(review, ReviewStatus.AI_REVIEW, 60, 'Performing AI-assisted code review via AI Platform');
      const aiResult = await this.aiPlatformService.executeAiReview(
        {
          repoFullName: review.repoFullName,
          pullRequestNumber: review.pullRequestNumber,
          prTitle: prDetails.title,
          prDescription: prDetails.description,
          author: prDetails.author,
          baseBranch: prDetails.baseBranch,
          headBranch: prDetails.headBranch,
          changedFiles: prFiles,
          staticFindings,
          customRules: repoConfig?.customRules,
        },
        review._id as Types.ObjectId,
        review.repositoryId as Types.ObjectId,
        review.requestedBy as Types.ObjectId,
      );

      // Cancellation check
      if (await this.isJobCancelled(jobId)) return;

      // STAGE 4: ARBITRATION, DEDUPLICATION & PERSISTENCE
      await this.updateReviewStage(review, ReviewStatus.AGGREGATING, 80, 'Arbitrating and deduplicating findings');
      const { findings: arbitratedFindings, severityCounts } = this.arbitrationService.arbitrateFindings(
        review.repoFullName,
        review.pullRequestNumber,
        staticFindings,
        aiResult.findings,
      );

      // Clear existing findings for this review before writing
      await this.findingModel.deleteMany({ reviewId: review._id });

      // Persist findings in database
      const findingDocs = arbitratedFindings.map((f) => ({
        reviewId: review._id,
        repositoryId: review.repositoryId,
        repoFullName: review.repoFullName,
        pullRequestNumber: review.pullRequestNumber,
        commitSha: prDetails.headSha,
        file: f.file,
        line: f.line,
        endLine: f.endLine,
        severity: f.severity,
        category: f.category,
        title: f.title,
        description: f.description,
        recommendation: f.recommendation,
        evidence: f.evidence,
        confidence: f.confidence,
        source: f.source,
        fingerprint: f.fingerprint,
      }));

      if (findingDocs.length > 0) {
        await this.findingModel.insertMany(findingDocs);
      }

      // MODEL REGRESSION QUALITY GATE CHECK
      let regressionStatus: string = RegressionStatus.NOT_RUN;
      let regressionRunId: string | undefined;
      let regressionSummary: any;

      const globalMode = this.configService.get<string>('app.modelRegression.checkMode') || 'manual';
      const repoRegressionEnabled = repoConfig?.regressionEnabled ?? (globalMode === 'review');
      const isCriticalOnlyMode = globalMode === 'critical-only' || repoConfig?.regressionPolicy === 'critical-only';
      const shouldRunRegression =
        repoRegressionEnabled ||
        (isCriticalOnlyMode && severityCounts.critical > 0) ||
        globalMode === 'review';

      if (shouldRunRegression) {
        this.logger.log(`Evaluating AI Model Regression for review #${review._id}`);
        try {
          const regressionResult = await this.modelRegressionService.checkRegression({
            reviewId: review._id.toString(),
            repository: review.repoFullName,
            pullRequest: review.pullRequestNumber,
            commitSha: prDetails.headSha,
            datasetId: repoConfig?.regressionDataset,
            baselineId: repoConfig?.regressionBaseline,
          });

          regressionStatus = regressionResult.status;
          regressionRunId = regressionResult.runId;
          regressionSummary = {
            passed: regressionResult.summary?.passed || 0,
            warnings: regressionResult.summary?.warnings || 0,
            failed: regressionResult.summary?.failed || 0,
            metrics: regressionResult.metrics,
            regressions: regressionResult.regressions,
            evaluatedAt: new Date(),
          };

          // Check if regression blocking is enabled
          const isBlocking = repoConfig?.regressionBlocking ?? this.configService.get<boolean>('app.modelRegression.blocking');
          if (regressionStatus === RegressionStatus.FAIL && isBlocking) {
            this.logger.warn(`Model regression detected in blocking mode for PR #${review._id}.`);
          }
        } catch (regErr: any) {
          this.logger.warn(`Model regression check encountered error: ${regErr.message}`);
          regressionStatus = RegressionStatus.ERROR;
        }
      }

      // Update review record with regression state
      await this.reviewModel.findByIdAndUpdate(review._id, {
        regressionStatus,
        regressionDecision: regressionStatus,
        regressionRunId,
        regressionSummary,
      });

      // STAGE 5: PUBLISHING GITHUB OUTPUTS
      await this.updateReviewStage(review, ReviewStatus.PUBLISHING, 90, 'Publishing review summary and check status');

      if (installationId && checkRunId) {
        const isBlocking = repoConfig?.regressionBlocking ?? this.configService.get<boolean>('app.modelRegression.blocking');
        const regressionBlockFail = isBlocking && regressionStatus === RegressionStatus.FAIL;
        const conclusion = severityCounts.critical > 0 || severityCounts.high > 0 || regressionBlockFail
          ? 'failure'
          : 'success';

        const annotations = arbitratedFindings
          .filter((f) => f.line && f.line > 0)
          .map((f) => ({
            path: f.file,
            start_line: f.line!,
            end_line: f.endLine || f.line!,
            annotation_level: (f.severity === Severity.CRITICAL || f.severity === Severity.HIGH
              ? 'failure'
              : f.severity === Severity.MEDIUM
                ? 'warning'
                : 'notice') as 'failure' | 'warning' | 'notice',
            title: `[${f.severity}] ${f.title}`,
            message: `${f.description}\n\nRecommendation: ${f.recommendation}`,
          }));

        const checkSummaryMarkdown = this.buildCheckSummaryMarkdown(
          aiResult.summary,
          severityCounts,
          regressionStatus,
          regressionSummary,
        );

        await this.githubApi.updateCheckRun(
          parsed.owner,
          parsed.repo,
          checkRunId,
          conclusion,
          checkSummaryMarkdown,
          annotations,
          installationId,
        );
      }

      // Optional PR Comment
      const autoComment = repoConfig?.autoCommentEnabled ?? this.configService.get<boolean>('app.github.autoCommentEnabled');
      if (autoComment && installationId && arbitratedFindings.length > 0) {
        const commentBody = this.buildPrCommentMarkdown(aiResult.summary, arbitratedFindings, regressionStatus);
        await this.githubApi.postPullRequestComment(parsed.owner, parsed.repo, parsed.pullNumber, commentBody, installationId);
      }

      // STAGE 6: COMPLETION & NOTIFICATIONS
      const durationMs = Date.now() - startTime;
      await this.reviewModel.findByIdAndUpdate(review._id, {
        status: ReviewStatus.COMPLETED,
        progressPercent: 100,
        currentStage: 'Completed',
        summary: aiResult.summary,
        severityCounts,
        completedAt: new Date(),
      });

      await this.updateJobStatus(job, JobStatus.COMPLETED, `Review completed in ${durationMs}ms with ${arbitratedFindings.length} findings`);

      // Dispatch Notifications
      const isSevereRegression = regressionStatus === RegressionStatus.FAIL;
      const eventType = isSevereRegression
        ? 'regression.failed'
        : severityCounts.critical > 0
          ? 'finding.critical_detected'
          : 'review.completed';

      await this.notificationsService.sendNotification({
        eventType: eventType as any,
        repoFullName: review.repoFullName,
        pullRequestNumber: review.pullRequestNumber,
        prTitle: prDetails.title,
        prUrl: review.prUrl,
        status: 'COMPLETED',
        criticalFindingsCount: severityCounts.critical,
        totalFindingsCount: severityCounts.total,
        summary: aiResult.summary,
      });

      this.logger.log(`PR Review #${review._id} completed successfully in ${durationMs}ms`);
    } catch (err: any) {
      this.logger.error(`PR Review pipeline failed for Review #${review._id}: ${err.message}`, err.stack);
      await this.reviewModel.findByIdAndUpdate(review._id, {
        status: ReviewStatus.FAILED,
        error: err.message,
        completedAt: new Date(),
      });
      await this.updateJobStatus(job, JobStatus.FAILED, `Review failed: ${err.message}`);

      // Dispatch failure notification
      await this.notificationsService.sendNotification({
        eventType: 'review.failed',
        repoFullName: review.repoFullName,
        pullRequestNumber: review.pullRequestNumber,
        prTitle: review.prTitle || 'Pull Request Review',
        prUrl: review.prUrl,
        status: 'FAILED',
        criticalFindingsCount: 0,
        totalFindingsCount: 0,
        summary: `Review failed: ${err.message}`,
      });

      throw err;
    }
  }

  private async isJobCancelled(jobId: string): Promise<boolean> {
    const job = await this.jobModel.findOne({ jobId });
    if (job?.isCancelled) {
      this.logger.log(`Job ${jobId} was cancelled during execution`);
      await this.updateJobStatus(job, JobStatus.CANCELLED, 'Execution aborted due to cancellation');
      await this.reviewModel.findByIdAndUpdate(job.reviewId, { status: ReviewStatus.CANCELLED });
      return true;
    }
    return false;
  }

  private async updateReviewStage(
    review: PullRequestReviewDocument,
    status: ReviewStatus,
    progressPercent: number,
    currentStage: string,
  ) {
    await this.reviewModel.findByIdAndUpdate(review._id, {
      status,
      progressPercent,
      currentStage,
    });
  }

  private async updateJobStatus(
    job: ReviewJobDocument,
    status: JobStatus,
    logMessage: string,
  ) {
    job.status = status;
    job.logs.push({
      timestamp: new Date(),
      stage: status,
      message: logMessage,
    });
    await job.save();
  }

  private buildCheckSummaryMarkdown(
    summary: string,
    severityCounts: any,
    regressionStatus: string,
    regressionSummary?: any,
  ): string {
    const regIcon =
      regressionStatus === 'PASS'
        ? '✅'
        : regressionStatus === 'WARN'
          ? '⚠️'
          : regressionStatus === 'FAIL'
            ? '❌'
            : regressionStatus === 'ERROR'
              ? '⚠️'
              : 'ℹ️';

    let md = `## 🤖 AI Code Review Summary\n\n${summary}\n\n`;
    md += `### 🚦 Automated Quality Gates\n`;
    md += `- ✅ Static Code Analysis (ESLint & TypeScript Rules)\n`;
    md += `- ✅ Context-Aware AI Review (Shared AI Platform)\n`;
    md += `- ✅ Finding Arbitration & Deduplication\n`;
    md += `- ${regIcon} AI Model Regression Check: **${regressionStatus}**\n`;

    if (regressionSummary?.metrics && Object.keys(regressionSummary.metrics).length > 0) {
      md += `\n**Evaluation Metrics:**\n`;
      for (const [key, val] of Object.entries(regressionSummary.metrics)) {
        if (typeof val === 'object' && val !== null) {
          const v = val as any;
          md += `- ${key}: current **${v.current ?? 'N/A'}** vs baseline **${v.baseline ?? 'N/A'}**\n`;
        }
      }
    }

    md += `\n### 🔍 Issues Found (${severityCounts.total})\n`;
    md += `- **Critical**: ${severityCounts.critical} | **High**: ${severityCounts.high} | **Medium**: ${severityCounts.medium} | **Low**: ${severityCounts.low}\n`;
    return md;
  }

  private buildPrCommentMarkdown(summary: string, findings: any[], regressionStatus?: string): string {
    let md = `## 🤖 AI Pull Request Review Summary\n\n${summary}\n\n`;
    if (regressionStatus && regressionStatus !== 'NOT_RUN') {
      const regIcon = regressionStatus === 'PASS' ? '✅' : regressionStatus === 'WARN' ? '⚠️' : '❌';
      md += `> **Model Quality Gate**: ${regIcon} AI Regression Status: **${regressionStatus}**\n\n`;
    }
    md += `### 🔍 Key Findings (${findings.length})\n\n`;
    for (const f of findings.slice(0, 5)) {
      md += `#### [${f.severity}] ${f.title}\n`;
      md += `- **File**: \`${f.file}\`${f.line ? ` (line ${f.line})` : ''}\n`;
      md += `- **Category**: ${f.category} | **Confidence**: ${Math.round(f.confidence * 100)}%\n`;
      md += `- **Description**: ${f.description}\n`;
      md += `- **Recommendation**: ${f.recommendation}\n\n`;
    }
    if (findings.length > 5) {
      md += `_...and ${findings.length - 5} more findings available on the AI Review Dashboard._\n`;
    }
    return md;
  }
}

