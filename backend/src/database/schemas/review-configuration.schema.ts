import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Severity } from '../../common/enums';

export type ReviewConfigurationDocument = ReviewConfiguration & Document;

@Schema({ timestamps: true })
export class ReviewConfiguration {
  @Prop({ type: Types.ObjectId, ref: 'Repository', index: true })
  repositoryId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', index: true })
  userId?: Types.ObjectId;

  @Prop({ default: false })
  autoCommentEnabled: boolean;

  @Prop({ enum: Object.values(Severity), default: Severity.HIGH })
  minCommentSeverity: Severity;

  @Prop({ default: 0.8, min: 0, max: 1 })
  minCommentConfidence: number;

  @Prop({ type: [String], default: ['ESLINT', 'TYPESCRIPT', 'AI'] })
  enabledAnalyzers: string[];

  @Prop({ type: [String], default: [] })
  customRules: string[];

  @Prop({
    type: [String],
    default: [
      '*.lock',
      'package-lock.json',
      'yarn.lock',
      'pnpm-lock.yaml',
      'dist/**',
      'build/**',
      'node_modules/**',
      '*.min.js',
      '*.svg',
      '*.png',
      '*.jpg',
    ],
  })
  ignoredFiles: string[];

  @Prop({ default: 50 })
  maxFilesPerReview: number;
}

export const ReviewConfigurationSchema = SchemaFactory.createForClass(ReviewConfiguration);
ReviewConfigurationSchema.index({ repositoryId: 1, userId: 1 });
