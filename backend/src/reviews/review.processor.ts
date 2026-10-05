import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { ReviewOrchestratorService } from './review-orchestrator.service';

export interface PrReviewJobData {
  jobId: string;
  reviewId: string;
  repoFullName: string;
  pullRequestNumber: number;
}

@Processor('pr-review')
export class ReviewProcessor extends WorkerHost {
  private readonly logger = new Logger(ReviewProcessor.name);

  constructor(private readonly orchestrator: ReviewOrchestratorService) {
    super();
  }

  async process(job: Job<PrReviewJobData>): Promise<void> {
    this.logger.log(
      `BullMQ processing PR review job #${job.id} for ${job.data.repoFullName}#${job.data.pullRequestNumber}`,
    );

    try {
      await this.orchestrator.processReview(job.data.jobId);
    } catch (err: any) {
      this.logger.error(`BullMQ job #${job.id} failed: ${err.message}`, err.stack);
      throw err;
    }
  }
}
