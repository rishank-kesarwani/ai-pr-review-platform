import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true, index: true, lowercase: true, trim: true })
  email: string;

  @Prop({ required: true })
  name: string;

  @Prop({ select: false })
  passwordHash?: string;

  @Prop({ index: true, sparse: true })
  githubId?: string;

  @Prop({ index: true, sparse: true })
  githubUsername?: string;

  @Prop()
  avatarUrl?: string;

  @Prop({ select: false })
  refreshTokenHash?: string;

  @Prop({ type: [String], default: ['user'] })
  roles: string[];

  @Prop({ default: true })
  isActive: boolean;
}

export const UserSchema = SchemaFactory.createForClass(User);
