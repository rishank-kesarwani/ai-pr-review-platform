import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ReviewStatus } from '../../common/enums';

export type PullRequestReviewDocument = PullRequestReview & Document;

@Schema({ timestamps: true })
export class PullRequestReview {
  @Prop({ type: Types.ObjectId, ref: 'Repository', index: true })
  repositoryId?: Types.ObjectId;

  @Prop({ required: true, index: true })
  repoFullName: string; // e.g. "facebook/react"

  @Prop({ required: true, index: true })
  pullRequestNumber: number;

  @Prop({ required: true })
  prTitle: string;

  @Prop()
  prDescription?: string;

  @Prop({ required: true })
  prUrl: string;

  @Prop()
  author?: string;

  @Prop({ required: true })
  baseBranch: string;

  @Prop({ required: true })
  headBranch: string;

  @Prop({ required: true, index: true })
  commitSha: string;

  @Prop({
    required: true,
    enum: Object.values(ReviewStatus),
    default: ReviewStatus.QUEUED,
    index: true,
  })
  status: ReviewStatus;

  @Prop({ default: 0 })
  progressPercent: number;

  @Prop()
  currentStage?: string;

  @Prop()
  summary?: string;

  @Prop({
    type: {
      critical: { type: Number, default: 0 },
      high: { type: Number, default: 0 },
      medium: { type: Number, default: 0 },
      low: { type: Number, default: 0 },
      info: { type: Number, default: 0 },
      total: { type: Number, default: 0 },
    },
    default: { critical: 0, high: 0, medium: 0, low: 0, info: 0, total: 0 },
  })
  severityCounts: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
    total: number;
  };

  @Prop({ default: 0 })
  filesAnalyzed: number;

  @Prop({ default: 0 })
  additions: number;

  @Prop({ default: 0 })
  deletions: number;

  @Prop({ default: 'MANUAL', enum: ['WEBHOOK', 'MANUAL', 'EXTENSION'] })
  triggeredBy: string;

  @Prop({ type: Types.ObjectId, ref: 'User', index: true })
  requestedBy?: Types.ObjectId;

  @Prop({ default: false })
  isPublic: boolean;

  @Prop()
  checkRunId?: number;

  @Prop()
  error?: string;

  @Prop()
  startedAt?: Date;

  @Prop()
  completedAt?: Date;
}

export const PullRequestReviewSchema = SchemaFactory.createForClass(PullRequestReview);
PullRequestReviewSchema.index({ repoFullName: 1, pullRequestNumber: 1, commitSha: 1 });
PullRequestReviewSchema.index({ createdAt: -1 });
PullRequestReviewSchema.index({ status: 1, createdAt: -1 });
