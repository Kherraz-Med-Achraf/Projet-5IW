import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Chat extends Document {
  @Prop({ type: [String], required: true })
  participants: string[];
}

export const ChatSchema = SchemaFactory.createForClass(Chat);
