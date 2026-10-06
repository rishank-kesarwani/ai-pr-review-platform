import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  Optional,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import * as crypto from 'crypto';
import { PullRequestReview, PullRequestReviewDocument } from '../database/schemas/pull-request-review.schema';
import { ReviewJob, ReviewJobDocument } from '../database/schemas/review-job.schema';
import { ReviewFinding, ReviewFindingDocument } from '../database/schemas/review-finding.schema';
import { Repository, RepositoryDocument } from '../database/schemas/repository.schema';
import { parseGitHubPrUrl } from '../common/utils/github-url-parser.util';
import { ReviewStatus, JobStatus } from '../common/enums';
import { ReviewOrchestratorService } from './review-orchestrator.service';
import { ReviewQueryDto, FindingQueryDto } from './dto/review.dto';
import { PullRequestDetails } from '../github/github-api.service';

export interface EnqueueReviewOptions {
  prUrl: string;
  repositoryId?: string;
  userId?: string;
  triggeredBy?: string;
  installationId?: number;
  prDetails?: PullRequestDetails;
}

@Injectable()
export class ReviewsService {
  private readonly logger = new Logger(ReviewsService.name);

  constructor(
    @InjectModel(PullRequestReview.name) private reviewModel: Model<PullRequestReviewDocument>,
    @InjectModel(ReviewJob.name) private jobModel: Model<ReviewJobDocument>,
    @InjectModel(ReviewFinding.name) private findingModel: Model<ReviewFindingDocument>,
    @InjectModel(Repository.name) private repoModel: Model<RepositoryDocument>,
    private readonly orchestrator: ReviewOrchestratorService,
    @Optional() @InjectQueue('pr-review') private prReviewQueue?: Queue,
  ) {}

  async enqueueReview(options: EnqueueReviewOptions): Promise<PullRequestReviewDocument> {
    const parsed = parseGitHubPrUrl(options.prUrl);
    if (!parsed) {
      throw new BadRequestException('Invalid GitHub Pull Request URL. Expected format: https://github.com/owner/repo/pull/123');
    }

    const repoFullName = `${parsed.owner}/${parsed.repo}`;
    const pullNumber = parsed.pullNumber;

    // Check existing repository doc or create placeholder
    let repoDoc = options.repositoryId
      ? await this.repoModel.findById(options.repositoryId)
      : await this.repoModel.findOne({ fullName: repoFullName });

    // Check if an active review is already in progress
    const activeReview = await this.reviewModel.findOne({
      repoFullName,
      pullRequestNumber: pullNumber,
      status: { $in: [ReviewStatus.QUEUED, ReviewStatus.FETCHING, ReviewStatus.ANALYZING, ReviewStatus.AI_REVIEW, ReviewStatus.AGGREGATING] },
    });

    if (activeReview) {
      this.logger.log(`Review already active for ${repoFullName}#${pullNumber} (Review ID: ${activeReview._id})`);
      return activeReview;
    }

    const commitSha = options.prDetails?.headSha || 'latest';
    const idempotencyKey = `job:${repoFullName}:${pullNumber}:${commitSha}:${Date.now()}`;
    const jobId = crypto.randomUUID();

    // Create Review Record
    const review = await this.reviewModel.create({
      repositoryId: repoDoc?._id,
      repoFullName,
      pullRequestNumber: pullNumber,
      prTitle: options.prDetails?.title || `PR #${pullNumber} on ${repoFullName}`,
      prDescription: options.prDetails?.description || '',
      prUrl: options.prUrl,
      author: options.prDetails?.author || 'unknown',
      baseBranch: options.prDetails?.baseBranch || 'main',
      headBranch: options.prDetails?.headBranch || 'head',
      commitSha,
      status: ReviewStatus.QUEUED,
      progressPercent: 0,
      currentStage: 'Queued',
      triggeredBy: options.triggeredBy || 'MANUAL',
      requestedBy: options.userId ? new Types.ObjectId(options.userId) : undefined,
      isPublic: !options.userId,
      startedAt: new Date(),
    });

    // Create Review Job Record
    await this.jobModel.create({
      jobId,
      reviewId: review._id,
      repositoryId: repoDoc?._id,
      status: JobStatus.PENDING,
      idempotencyKey,
      logs: [
        {
          timestamp: new Date(),
          stage: 'QUEUED',
          message: 'Review job queued for processing',
        },
      ],
    });

    // Enqueue in BullMQ or fallback to asynchronous in-process execution
    if (this.prReviewQueue) {
      try {
        await this.prReviewQueue.add(
          'analyze-pr',
          {
            jobId,
            reviewId: review._id.toString(),
            repoFullName,
            pullRequestNumber: pullNumber,
          },
          {
            jobId,
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 3000,
            },
            removeOnComplete: true,
          },
        );
        this.logger.log(`Enqueued review job #${jobId} to BullMQ queue`);
      } catch (queueErr: any) {
        this.logger.warn(`Failed to add job to BullMQ queue (${queueErr.message}). Falling back to async background execution.`);
        setImmediate(() => this.orchestrator.processReview(jobId));
      }
    } else {
      this.logger.log(`Executing review job #${jobId} asynchronously via direct orchestrator`);
      setImmediate(() => this.orchestrator.processReview(jobId));
    }

    return review;
  }

  async getReviews(query: ReviewQueryDto, userId?: string) {
    const filter: any = {};
    if (query.status) filter.status = query.status;
    if (query.repoFullName) filter.repoFullName = new RegExp(query.repoFullName, 'i');
    if (userId) filter.$or = [{ requestedBy: new Types.ObjectId(userId) }, { isPublic: true }];

    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      this.reviewModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      this.reviewModel.countDocuments(filter),
    ]);

    return {
      reviews,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getReviewById(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid Review ID format');
    }
    const review = await this.reviewModel.findById(id).lean();
    if (!review) {
      throw new NotFoundException(`Review #${id} not found`);
    }
    return review;
  }

  async getReviewFindings(reviewId: string, query: FindingQueryDto) {
    if (!Types.ObjectId.isValid(reviewId)) {
      throw new BadRequestException('Invalid Review ID format');
    }

    const filter: any = { reviewId: new Types.ObjectId(reviewId) };
    if (query.severity) filter.severity = query.severity;
    if (query.category) filter.category = query.category;
    if (query.file) filter.file = new RegExp(query.file, 'i');

    const findings = await this.findingModel.find(filter).sort({ severity: 1, confidence: -1 }).lean();
    return findings;
  }

  async cancelReview(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid Review ID format');
    }

    const review = await this.reviewModel.findById(id);
    if (!review) {
      throw new NotFoundException(`Review #${id} not found`);
    }

    if (review.status === ReviewStatus.COMPLETED || review.status === ReviewStatus.FAILED) {
      throw new BadRequestException(`Cannot cancel a review that is already ${review.status}`);
    }

    await this.reviewModel.findByIdAndUpdate(id, {
      status: ReviewStatus.CANCELLED,
      currentStage: 'Cancelled by user',
    });

    await this.jobModel.updateMany({ reviewId: review._id }, { isCancelled: true, status: JobStatus.CANCELLED });

    return { success: true, message: 'Review cancelled successfully' };
  }

  async retryReview(id: string, userId?: string) {
    const review = await this.getReviewById(id);
    return this.enqueueReview({
      prUrl: review.prUrl,
      repositoryId: review.repositoryId?.toString(),
      userId,
      triggeredBy: 'RETRY',
    });
  }

  async getReviewRegression(id: string) {
    const review: any = await this.getReviewById(id);
    const status = review.regressionStatus || 'NOT_RUN';
    return {
      reviewId: review._id,
      status,
      decision: status,
      runId: review.regressionRunId || null,
      summary: {
        passed: review.regressionSummary?.passed || 0,
        warnings: review.regressionSummary?.warnings || 0,
        failed: review.regressionSummary?.failed || 0,
      },
      metrics: review.regressionSummary?.metrics || {},
      regressions: review.regressionSummary?.regressions || [],
      evaluatedAt: review.regressionSummary?.evaluatedAt || review.updatedAt || new Date(),
    };
  }

  async triggerReviewRegression(id: string) {
    const review = await this.getReviewById(id);
    const repoDoc = review.repositoryId ? await this.repoModel.findById(review.repositoryId) : null;

    // Trigger on-demand regression check
    const regressionResult = await this.orchestrator['modelRegressionService'].checkRegression({
      reviewId: review._id.toString(),
      repository: review.repoFullName,
      pullRequest: review.pullRequestNumber,
      commitSha: review.commitSha,
    });

    const updated = await this.reviewModel.findByIdAndUpdate(
      id,
      {
        regressionStatus: regressionResult.status,
        regressionRunId: regressionResult.runId,
        regressionSummary: {
          passed: regressionResult.summary?.passed || 0,
          warnings: regressionResult.summary?.warnings || 0,
          failed: regressionResult.summary?.failed || 0,
          metrics: regressionResult.metrics,
          regressions: regressionResult.regressions,
          evaluatedAt: new Date(),
        },
      },
      { new: true },
    );

    return this.getReviewRegression(id);
  }
}

