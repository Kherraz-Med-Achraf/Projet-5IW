import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PrismaModule } from '../prisma/prisma.module';
import { Chat, ChatSchema } from './schemas/chat.schema';
import { Message, MessageSchema } from './schemas/message.schema';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';
import { ChatController } from './chat.controller';
import { AuthModule } from '../auth/auth.module';
import { WsThrottlerGuard } from '../common/guards/ws-throttler.guard';

@Module({
  imports: [
    forwardRef(() => AuthModule),      
    PrismaModule,
    MongooseModule.forFeature([
      { name: Chat.name,    schema: ChatSchema },
      { name: Message.name, schema: MessageSchema },
    ]),
  ],
  providers: [ChatService, ChatGateway, WsThrottlerGuard],
  controllers: [ChatController],
  exports: [ChatService],
})
export class ChatModule {}
