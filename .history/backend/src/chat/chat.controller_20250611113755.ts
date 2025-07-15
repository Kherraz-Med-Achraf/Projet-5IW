import {
    Controller,
    Get,
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
    constructor(private chatService: ChatService) {}
  
    /** Liste tous les chats de l'utilisateur */
    @Get()
    async listChats(@Request() req) {
      return this.chatService.findAllForUser(req.user.id);
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
  