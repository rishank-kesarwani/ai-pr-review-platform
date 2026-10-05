import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Severity } from '../../common/enums';

export type NotificationPreferenceDocument = NotificationPreference & Document;

@Schema({ timestamps: true })
export class NotificationPreference {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true, index: true })
  userId: Types.ObjectId;

  @Prop({ default: true })
  emailNotifications: boolean;

  @Prop({ default: false })
  webhookNotifications: boolean;

  @Prop()
  webhookUrl?: string;

  @Prop({ enum: Object.values(Severity), default: Severity.HIGH })
  minSeverity: Severity;

  @Prop({ default: true })
  notifyOnCompletion: boolean;

  @Prop({ default: true })
  notifyOnFailure: boolean;
}

export const NotificationPreferenceSchema = SchemaFactory.createForClass(NotificationPreference);
