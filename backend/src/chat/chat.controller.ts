import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ChatService } from './chat.service';
import { CreateChatDto } from './dto/create-chat.dto';
import { GetMessagesQueryDto } from './dto/get-messages-query.dto';
import { UpdateMessageDto } from './dto/update-message.dto';
import { ParseObjectIdPipe } from '../common/pipes/parse-objectid.pipe';
import { Throttle } from '@nestjs/throttler';
import { ChatGateway } from './chat.gateway';

@Controller('chats')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly gateway: ChatGateway,
  ) {}

  @Get()
  listChats(@Request() req) {
    return this.chatService.findAllForUser(req.user.id);
  }

  @Get('contacts')
  getContacts(@Request() req) {
    return this.chatService.getAllowedContacts(req.user.id, req.user.role);
  }

  @Post()
  @Throttle({ createChat: { limit: 5, ttl: 60 } })
  async createChat(@Body() dto: CreateChatDto, @Request() req) {
    const chat = await this.chatService.createChat(
      dto.participants,
      req.user.id,
      req.user.role,
    );

    // transformer si besoin
    const plain: any = (chat as any).toObject ? (chat as any).toObject() : chat;

    // notifier les deux participants
    plain.participants.forEach((uid: string) => {
      this.gateway.server.to(uid).emit('newChat', {
        id: plain.id ?? plain._id,
        participants: plain.participants,
        updatedAt: plain.updatedAt,
        lastMessage: plain.lastMessage ?? null,
        createdAt: plain.createdAt,
      });
    });

    return chat;
  }

  @Get(':id/messages')
  async getMessages(
    @Param('id', ParseObjectIdPipe) chatId: string,
    @Query() query: GetMessagesQueryDto,
    @Request() req,
  ) {
    if (!(await this.chatService.canAccessChat(req.user.id, chatId))) {
      throw new ForbiddenException('Accès refusé à ce chat');
    }
    return this.chatService.getMessages(
      chatId,
      query.limit,
      query.before ? new Date(query.before) : undefined,
    );
  }

  @Patch(':chatId/messages/:msgId')
  async updateMessage(
    @Param('chatId', ParseObjectIdPipe) chatId: string,
    @Param('msgId', ParseObjectIdPipe) msgId: string,
    @Body() body: UpdateMessageDto,
    @Request() req,
  ) {
    return this.chatService.updateMessage(
      chatId,
      msgId,
      req.user.id,
      body.content,
    );
  }

  @Delete(':chatId/messages/:msgId')
  async deleteMessage(
    @Param('chatId', ParseObjectIdPipe) chatId: string,
    @Param('msgId', ParseObjectIdPipe) msgId: string,
    @Request() req,
  ) {
    return this.chatService.deleteMessage(chatId, msgId, req.user.id);
  }

  /* Marquer toutes les informations comme lues pour l'utilisateur courant */
  @Patch(':chatId/read')
  async markRead(
    @Param('chatId', ParseObjectIdPipe) chatId: string,
    @Request() req,
  ) {
    await this.chatService.markAsRead(chatId, req.user.id);
    return { ok: true };
  }
}
