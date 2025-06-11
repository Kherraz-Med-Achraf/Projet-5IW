import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Chat } from './schemas/chat.schema';
import { Message } from './schemas/message.schema';

@Injectable()
export class ChatService {
  constructor(
    @InjectModel(Chat.name) private chatModel: Model<Chat>,
    @InjectModel(Message.name) private msgModel: Model<Message>,
  ) {}

  /** Crée une nouvelle conversation avec les participants donnés */
  async createChat(participantIds: string[]): Promise<Chat> {
    const objectIds = participantIds.map(id => new Types.ObjectId(id));
    return this.chatModel.create({ participants: objectIds });
  }

  /** Liste tous les chats où cet utilisateur est participant */
  async findAllForUser(userId: string): Promise<Chat[]> {
    return this.chatModel.find({ participants: userId }).exec();
  }

  /** Vérifie que userId fait partie du chat */
  async canAccessChat(userId: string, chatId: string): Promise<boolean> {
    const chat = await this.chatModel.findById(chatId).exec();
    if (!chat) throw new NotFoundException('Chat introuvable');
    return chat.participants.some(p => p.toString() === userId);
  }

  /** Enregistre un message en base, après vérif. d’accès */
  async createMessage(chatId: string, authorId: string, content: string) {
    if (!(await this.canAccessChat(authorId, chatId))) {
      throw new ForbiddenException('Accès refusé à ce chat');
    }
    return this.msgModel.create({
      chat: new Types.ObjectId(chatId),
      author: new Types.ObjectId(authorId),
      content,
    });
  }

  /** Récupère les derniers messages (pagination) */
  async getMessages(
    chatId: string,
    limit = 50,
    before?: Date,
  ): Promise<Message[]> {
    if (!(await this.canAccessChat(before ? before.toString() : '', chatId))) {
      // on passe un userId fictif qui échouera, assure que l'appelant vérifie l'accès d'abord
      throw new ForbiddenException('Accès refusé à ce chat');
    }
    const filter: any = { chat: chatId };
    if (before) filter.sentAt = { $lt: before };
    return this.msgModel
      .find(filter)
      .sort({ sentAt: -1 })
      .limit(limit)
      .exec();
  }
}
