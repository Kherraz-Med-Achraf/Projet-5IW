// backend/src/chat/chat.service.ts
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
    // Vous pouvez injecter ici une source de données utilisateur (TypeORM repository ou UserService) :
    // private userService: UserService,
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

  /**
   * Retourne la liste des utilisateurs qu'un utilisateur peut contacter
   * selon sa matrice de droits.
   */
  async getAllowedContacts(
    userId: string,
    role: string,
  ): Promise<Array<{ id: string; name: string; role: string }>> {
    // TODO: implémenter la logique de filtrage selon les rôles et liens (staff–enfant, etc.)
    // Exemple de stub :
    // const allUsers = await this.userService.findAllSummaries();
    // return allUsers.filter(u => this.isAllowed(role, u.role, userId, u.id));
    return [];
  }
}
