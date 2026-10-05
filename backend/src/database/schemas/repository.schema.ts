import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type RepositoryDocument = Repository & Document;

@Schema({ timestamps: true })
export class Repository {
  @Prop({ required: true, unique: true, index: true })
  githubRepoId: number;

  @Prop({ required: true, index: true })
  owner: string;

  @Prop({ required: true, index: true })
  name: string;

  @Prop({ required: true, unique: true, index: true })
  fullName: string; // e.g. "facebook/react"

  @Prop({ default: false })
  isPrivate: boolean;

  @Prop({ default: 'main' })
  defaultBranch: string;

  @Prop({ index: true })
  installationId?: number;

  @Prop({ type: Types.ObjectId, ref: 'User', index: true })
  addedBy?: Types.ObjectId;

  @Prop({ default: true })
  isActive: boolean;
}

export const RepositorySchema = SchemaFactory.createForClass(Repository);
RepositorySchema.index({ owner: 1, name: 1 });
