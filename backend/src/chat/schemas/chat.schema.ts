import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Chat extends Document {
  @Prop({ type: [String], required: true })
  participants: string[];

  // Timestamps added automatically via `timestamps: true` option but explicitly
  // declaring them here ensures TypeScript is aware of their existence.
  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;

  // Date de dernière lecture par utilisateur { [userId]: Date }
  @Prop({ type: Map, of: Date, default: {} })
  lastReads: Map<string, Date>;
}

export const ChatSchema = SchemaFactory.createForClass(Chat);
