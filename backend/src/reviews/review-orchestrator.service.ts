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
import { parseGitHubPrUrl } from '../common/utils/github-url-parser.util';
import { ReviewStatus, JobStatus, Severity } from '../common/enums';

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

      // Check repo configuration if exists
      const repoConfig = await this.configModel.findOne({ repositoryId: review.repositoryId }).lean();
      const maxFiles = repoConfig?.maxFilesPerReview || this.configService.get<number>('app.reviewLimits.maxFiles') || 50;

      // Find installation ID if repository is registered
      let installationId: number | undefined;
      if (review.repositoryId) {
        const repo = await this.repoModel.findById(review.repositoryId);
        installationId = repo?.installationId;
      }

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
        baseBranch: prDetails.baseBranch,
        headBranch: prDetails.headBranch,
        commitSha: prDetails.headSha,
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

      // STAGE 5: PUBLISHING GITHUB OUTPUTS
      await this.updateReviewStage(review, ReviewStatus.PUBLISHING, 90, 'Publishing review summary and check status');

      if (installationId && checkRunId) {
        const conclusion = severityCounts.critical > 0 || severityCounts.high > 0 ? 'failure' : 'success';
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

        await this.githubApi.updateCheckRun(
          parsed.owner,
          parsed.repo,
          checkRunId,
          conclusion,
          aiResult.summary || 'AI Review completed successfully.',
          annotations,
          installationId,
        );
      }

      // Optional PR Comment
      const autoComment = repoConfig?.autoCommentEnabled ?? this.configService.get<boolean>('app.github.autoCommentEnabled');
      if (autoComment && installationId && arbitratedFindings.length > 0) {
        const commentBody = this.buildPrCommentMarkdown(aiResult.summary, arbitratedFindings);
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
      await this.notificationsService.sendNotification({
        eventType: severityCounts.critical > 0 ? 'finding.critical_detected' : 'review.completed',
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

  private buildPrCommentMarkdown(summary: string, findings: any[]): string {
    let md = `## 🤖 AI Pull Request Review Summary\n\n${summary}\n\n### 🔍 Key Findings (${findings.length})\n\n`;
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
