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

@Controller('chats')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get()
  listChats(@Request() req) {
    return this.chatService.findAllForUser(req.user.id);
  }

  @Get('contacts')
  getContacts(@Request() req) {
    return this.chatService.getAllowedContacts(req.user.id, req.user.role);
  }

  @Post()
  createChat(@Body() dto: CreateChatDto, @Request() req) {
    return this.chatService.createChat(dto.participants, req.user.id, req.user.role);
  }

  @Get(':id/messages')
  async getMessages(
    @Param('id') chatId: string,
    @Query() query: GetMessagesQueryDto,
    @Request() req,
  ) {
    if (!(await this.chatService.canAccessChat(req.user.id, chatId))) {
      throw new ForbiddenException('Accès refusé à ce chat');
    }
    return this.chatService.getMessages(chatId, query.limit, query.before ? new Date(query.before) : undefined);
  }

  @Patch(':chatId/messages/:msgId')
  async updateMessage(
    @Param('chatId') chatId: string,
    @Param('msgId') msgId: string,
    @Body() body: UpdateMessageDto,
    @Request() req,
  ) {
    return this.chatService.updateMessage(chatId, msgId, req.user.id, body.content);
  }

  @Delete(':chatId/messages/:msgId')
  async deleteMessage(
    @Param('chatId') chatId: string,
    @Param('msgId') msgId: string,
    @Request() req,
  ) {
    return this.chatService.deleteMessage(chatId, msgId, req.user.id);
  }
}
