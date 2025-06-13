// backend/src/chat/schemas/message.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: { createdAt: 'sentAt' } })
export class Message extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Chat', required: true })
  chat: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  author: Types.ObjectId;

  @Prop({ type: String, required: true })
  content: string;

  /** Date d’envoi, générée automatiquement par Mongoose */
  @Prop()
  sentAt: Date;
}

export const MessageSchema = SchemaFactory.createForClass(Message);
