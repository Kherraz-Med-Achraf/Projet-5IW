import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PrismaModule } from '../prisma/prisma.module';
import { Chat, ChatSchema } from './schemas/chat.schema';
import { Message, MessageSchema } from './schemas/message.schema';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';
import { ChatController } from './chat.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    /* Accès Prisma */
    PrismaModule,

    /* Schémas Mongo pour chats et messages */
    MongooseModule.forFeature([
      { name: Chat.name,    schema: ChatSchema },
      { name: Message.name, schema: MessageSchema },
    ]),

    /* Récupère JwtService (et les guards) depuis AuthModule */
    forwardRef(() => AuthModule),
  ],
  providers: [ChatService, ChatGateway],
  controllers: [ChatController],
  exports: [ChatService],
})
export class ChatModule {}
