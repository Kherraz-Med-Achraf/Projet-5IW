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

@Controller('chats')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get()
  listChats(@Request() req) {
    return this.chatService.findAllForUser(req.user.id);
  }

  /** Contacts autorisés */
  @Get('contacts')
  getContacts(@Request() req) {
    return this.chatService.getAllowedContacts(req.user.id, req.user.role);
  }

  /** Crée une conversation */
  @Post()
  createChat(
    @Body('participants') participantIds: string[],
    @Request() req,
  ) {
    return this.chatService.createChat(
      participantIds,
      req.user.id,
      req.user.role,
    );
  }

  /** Historique paginé */
  @Get(':id/messages')
  async getMessages(
    @Param('id') chatId: string,
    @Query('limit') limit: string,
    @Query('before') before: string,
    @Request() req,
  ) {
    if (!(await this.chatService.canAccessChat(req.user.id, chatId))) {
      throw new ForbiddenException('Accès refusé à ce chat');
    }
    const lim = limit ? parseInt(limit, 10) : undefined;
    const _before = before ? new Date(before) : undefined;
    return this.chatService.getMessages(chatId, lim, _before);
  }

  /** Met à jour un message (seul l’auteur) */
  @Patch(':chatId/messages/:msgId')
  async updateMessage(
    @Param('chatId') chatId: string,
    @Param('msgId') msgId: string,
    @Body('content') content: string,
    @Request() req,
  ) {
    return this.chatService.updateMessage(
      chatId,
      msgId,
      req.user.id,
      content,
    );
  }

  /** Supprime un message (seul l’auteur) */
  @Delete(':chatId/messages/:msgId')
  async deleteMessage(
    @Param('chatId') chatId: string,
    @Param('msgId') msgId: string,
    @Request() req,
  ) {
    return this.chatService.deleteMessage(chatId, msgId, req.user.id);
  }
}
