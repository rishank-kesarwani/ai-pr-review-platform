import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type GitHubInstallationDocument = GitHubInstallation & Document;

@Schema({ timestamps: true })
export class GitHubInstallation {
  @Prop({ required: true, unique: true, index: true })
  installationId: number;

  @Prop({ required: true, index: true })
  accountLogin: string;

  @Prop({ required: true })
  accountType: 'User' | 'Organization';

  @Prop()
  accountAvatarUrl?: string;

  @Prop({ required: true, enum: ['all', 'selected'] })
  repositorySelection: string;

  @Prop({ type: Object })
  permissions: Record<string, string>;

  @Prop({ type: Types.ObjectId, ref: 'User', index: true })
  installedBy?: Types.ObjectId;

  @Prop({ default: true })
  isActive: boolean;
}

export const GitHubInstallationSchema = SchemaFactory.createForClass(GitHubInstallation);
