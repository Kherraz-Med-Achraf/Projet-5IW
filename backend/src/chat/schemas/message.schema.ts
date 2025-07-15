import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: { createdAt: 'sentAt' } })
export class Message extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Chat', required: true })
  chat: Types.ObjectId;

  @Prop({ type: String, required: true, index: true })
  author: string;

  @Prop({ type: String, required: true })
  content: string;

  @Prop() sentAt: Date;
}

export const MessageSchema = SchemaFactory.createForClass(Message);
