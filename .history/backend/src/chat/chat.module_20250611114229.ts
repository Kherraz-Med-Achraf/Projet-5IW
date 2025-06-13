// backend/src/chat/chat.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../prisma/prisma.module';   // ← ICI
import { Chat, ChatSchema } from './schemas/chat.schema';
import { Message, MessageSchema } from './schemas/message.schema';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';
import { ChatController } from './chat.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    PrismaModule,                            // ← ajoute ce module
    MongooseModule.forFeature([
      { name: Chat.name,    schema: ChatSchema },
      { name: Message.name, schema: MessageSchema },
    ]),
    JwtModule.register({}),
    forwardRef(() => AuthModule),
  ],
  providers: [ChatService, ChatGateway],
  controllers: [ChatController],
  exports: [ChatService],
})
export class ChatModule {}
