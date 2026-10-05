import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Severity, FindingCategory, AnalyzerType } from '../../common/enums';

export type ReviewFindingDocument = ReviewFinding & Document;

@Schema({ timestamps: true })
export class ReviewFinding {
  @Prop({ type: Types.ObjectId, ref: 'PullRequestReview', required: true, index: true })
  reviewId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Repository', index: true })
  repositoryId?: Types.ObjectId;

  @Prop({ required: true, index: true })
  repoFullName: string;

  @Prop({ required: true, index: true })
  pullRequestNumber: number;

  @Prop({ required: true, index: true })
  commitSha: string;

  @Prop({ required: true, index: true })
  file: string;

  @Prop()
  line?: number;

  @Prop()
  endLine?: number;

  @Prop({
    required: true,
    enum: Object.values(Severity),
    index: true,
  })
  severity: Severity;

  @Prop({
    required: true,
    enum: Object.values(FindingCategory),
    index: true,
  })
  category: FindingCategory;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true })
  recommendation: string;

  @Prop()
  evidence?: string;

  @Prop({ required: true, min: 0, max: 1 })
  confidence: number;

  @Prop({
    required: true,
    enum: Object.values(AnalyzerType),
  })
  source: AnalyzerType;

  @Prop({ required: true, index: true })
  fingerprint: string;

  @Prop({ default: false })
  isSuppressed: boolean;

  @Prop({ default: false })
  commentedOnGitHub: boolean;

  @Prop()
  gitHubCommentId?: number;
}

export const ReviewFindingSchema = SchemaFactory.createForClass(ReviewFinding);
ReviewFindingSchema.index({ reviewId: 1, severity: 1 });
ReviewFindingSchema.index({ reviewId: 1, fingerprint: 1 }, { unique: true });
ReviewFindingSchema.index({ repoFullName: 1, pullRequestNumber: 1, file: 1 });
