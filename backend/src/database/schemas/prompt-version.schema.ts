import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PromptVersionDocument = PromptVersion & Document;

@Schema({ timestamps: true })
export class PromptVersion {
  @Prop({ required: true, unique: true })
  version: string;

  @Prop({ required: true })
  systemPrompt: string;

  @Prop({ required: true })
  template: string;

  @Prop({ default: true })
  isActive: boolean;
}

export const PromptVersionSchema = SchemaFactory.createForClass(PromptVersion);
