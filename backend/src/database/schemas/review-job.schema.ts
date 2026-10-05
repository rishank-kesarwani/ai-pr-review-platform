import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { JobStatus } from '../../common/enums';

export type ReviewJobDocument = ReviewJob & Document;

@Schema({ timestamps: true })
export class ReviewJob {
  @Prop({ required: true, unique: true, index: true })
  jobId: string;

  @Prop({ type: Types.ObjectId, ref: 'PullRequestReview', required: true, index: true })
  reviewId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Repository', index: true })
  repositoryId?: Types.ObjectId;

  @Prop({ required: true, enum: Object.values(JobStatus), default: JobStatus.PENDING, index: true })
  status: JobStatus;

  @Prop({ default: 0 })
  progress: number;

  @Prop({ default: 1 })
  attempt: number;

  @Prop({ default: 3 })
  maxAttempts: number;

  @Prop({ required: true, unique: true, index: true })
  idempotencyKey: string;

  @Prop({ default: false, index: true })
  isCancelled: boolean;

  @Prop({ type: [{ timestamp: Date, stage: String, message: String }] })
  logs: { timestamp: Date; stage: string; message: string }[];

  @Prop()
  error?: string;
}

export const ReviewJobSchema = SchemaFactory.createForClass(ReviewJob);
ReviewJobSchema.index({ status: 1, createdAt: -1 });
