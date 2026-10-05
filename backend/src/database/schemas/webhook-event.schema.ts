import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type WebhookEventDocument = WebhookEvent & Document;

@Schema({ timestamps: true })
export class WebhookEvent {
  @Prop({ required: true, unique: true, index: true })
  eventId: string; // e.g. "github:delivery-id" or "repoId:prNumber:commitSha:action"

  @Prop({ required: true, index: true })
  eventType: string; // e.g. "pull_request"

  @Prop({ required: true })
  eventAction: string; // e.g. "opened", "synchronize"

  @Prop({ required: true, index: true })
  repoFullName: string;

  @Prop({ required: true })
  pullRequestNumber: number;

  @Prop({ required: true })
  commitSha: string;

  @Prop({ default: 'PROCESSED', enum: ['RECEIVED', 'PROCESSED', 'IGNORED', 'FAILED'] })
  status: string;

  @Prop({ type: Object })
  metadata?: Record<string, any>;
}

export const WebhookEventSchema = SchemaFactory.createForClass(WebhookEvent);
WebhookEventSchema.index({ createdAt: -1 });
