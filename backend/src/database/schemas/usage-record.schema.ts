import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type UsageRecordDocument = UsageRecord & Document;

@Schema({ timestamps: true })
export class UsageRecord {
  @Prop({ type: Types.ObjectId, ref: 'User', index: true })
  userId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Repository', index: true })
  repositoryId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'PullRequestReview', index: true })
  reviewId?: Types.ObjectId;

  @Prop({ default: 0 })
  promptTokens: number;

  @Prop({ default: 0 })
  completionTokens: number;

  @Prop({ default: 0 })
  totalTokens: number;

  @Prop({ default: 0 })
  executionTimeMs: number;

  @Prop({ required: true })
  model: string;

  @Prop({ default: 0 })
  estimatedCostUsd: number;
}

export const UsageRecordSchema = SchemaFactory.createForClass(UsageRecord);
UsageRecordSchema.index({ createdAt: -1 });
