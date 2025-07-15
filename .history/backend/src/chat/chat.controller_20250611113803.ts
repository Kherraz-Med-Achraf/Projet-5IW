// backend/src/chat/chat.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common
import { ChatService } from './chat.service';

@Controller('chats')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private chatService: ChatService) {}

  /** Liste tous les chats de l'utilisateur */
  @Get()
  async listChats(@Request() req) {
    return this.chatService.findAllForUser(req.user.id);
  }

  /** Liste tous les contacts autorisés pour démarrer une nouvelle conversation */
  @Get('contacts')
  async getContacts(@Request() req) {
    return this.chatService.getAllowedContacts(req.user.id, req.user.role);
  }

  /** Crée une nouvelle conversation */
  @Post()
  async createChat(
    @Body('participants') participantIds: string[],
    @Request() req,
  ) {
    // Optionnel : vérifier que req.user.id figure dans participantIds
    return this.chatService.createChat(participantIds);
  }

  /** Récupère l'historique des messages d'un chat (paged) */
  @Get(':id/messages')
  async getMessages(
    @Param('id') chatId: string,
    @Query('limit') limit: string,
    @Query('before') before: string,
    @Request() req,
  ) {
    // Vérification d'accès
    if (!(await this.chatService.canAccessChat(req.user.id, chatId))) {
      throw new ForbiddenException('Accès refusé à ce chat');
    }
    const lim = limit ? parseInt(limit, 10) : undefined;
    const beforeDate = before ? new Date(before) : undefined;
    return this.chatService.getMessages(chatId, lim, beforeDate);
  }
}
