// backend/src/chat/chat.service.ts
import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { PrismaService } from '../prisma/prisma.service';
import { Chat } from './schemas/chat.schema';
import { Message } from './schemas/message.schema';

type Contact = { id: string; name: string; role: string };

@Injectable()
export class ChatService {
  constructor(
    @InjectModel(Chat.name) private chatModel: Model<Chat>,
    @InjectModel(Message.name) private msgModel: Model<Message>,
    private prisma: PrismaService,
  ) {}

  /** Crée une nouvelle conversation avec les participants donnés,
   *  en vérifiant que la création est autorisée par matrice */
  async createChat(participantIds: string[], userId: string, userRole: string) {
    // on ne doit pas pouvoir créer un chat hors matrice
    for (const targetId of participantIds) {
      if (targetId === userId) continue;
      const target = await this.prisma.user.findUnique({
        where: { id: targetId },
        select: { id: true, role: true },
      });
      if (!target || !this.isAllowed(userRole, target.role, userId, target.id)) {
        throw new ForbiddenException("Vous ne pouvez pas démarrer une conversation avec cet utilisateur");
      }
    }
    const objectIds = participantIds.map(id => new Types.ObjectId(id));
    return this.chatModel.create({ participants: objectIds });
  }

  /** Liste tous les chats où cet utilisateur est participant */
  async findAllForUser(userId: string) {
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
   * selon sa matrice de rôles ET, pour STAFF/PARENT, selon la relation référent/enfant.
   */
  async getAllowedContacts(userId: string, role: string): Promise<Contact[]> {
    // 1) Rôles “admin” canaux fixes
    if (role === 'DIRECTOR' || role === 'SERVICE_MANAGER') {
      // peuvent contacter tous les DIRECTOR, SERVICE_MANAGER, SECRETARY, STAFF
      const users = await this.prisma.user.findMany({
        where: { role: { in: ['DIRECTOR','SERVICE_MANAGER','SECRETARY','STAFF'] } },
        select: { id: true, firstName: true, lastName: true, role: true },
      });
      return users.map(u => ({ id: u.id, name: `${u.firstName} ${u.lastName}`, role: u.role }));
    }
    if (role === 'SECRETARY') {
      // peuvent contacter DIRECTOR, SERVICE_MANAGER, STAFF
      const users = await this.prisma.user.findMany({
        where: { role: { in: ['DIRECTOR','SERVICE_MANAGER','STAFF'] } },
        select: { id: true, firstName: true, lastName: true, role: true },
      });
      return users.map(u => ({ id: u.id, name: `${u.firstName} ${u.lastName}`, role: u.role }));
    }

    // 2) STAFF
    if (role === 'STAFF') {
      // 2a) admin roles
      const admins = await this.prisma.user.findMany({
        where: { role: { in: ['DIRECTOR','SERVICE_MANAGER','SECRETARY'] } },
        select: { id: true, firstName: true, lastName: true, role: true },
      });
      // 2b) parents dont ce staff est référent
      const referentChildren = await this.prisma.child.findMany({
        where: { referents: { some: { id: userId } } },
        include: { parent: { include: { user: true } } },
      });
      const parentsMap = new Map<string, Contact>();
      for (const c of referentChildren) {
        const pu = c.parent.user;
        parentsMap.set(pu.id, {
          id: pu.id,
          name: `${pu.firstName} ${pu.lastName}`,
          role: pu.role,
        });
      }
      const contacts: Contact[] = [
        ...admins.map(u => ({ id: u.id, name: `${u.firstName} ${u.lastName}`, role: u.role })),
        ...Array.from(parentsMap.values()),
      ];
      return contacts;
    }

    // 3) PARENT
    if (role === 'PARENT') {
      // children for this parent
      const parentProfile = await this.prisma.parentProfile.findUnique({
        where: { userId },
        include: { children: true },
      });
      const childIds = (parentProfile?.children || []).map(c => c.id);
      // staff référents de ces enfants
      const staffs = await this.prisma.user.findMany({
        where: { referentOf: { some: { id: { in: childIds } } } },
        select: { id: true, firstName: true, lastName: true, role: true },
      });
      return staffs.map(u => ({ id: u.id, name: `${u.firstName} ${u.lastName}`, role: u.role }));
    }

    // 4) pas d’accès pour les autres rôles
    return [];
  }

  /** Matrice brute de qui peut contacter qui, sans contexte enfant/référent */
  private isAllowed(
    senderRole: string,
    receiverRole: string,
    senderId: string,
    receiverId: string,
  ): boolean {
    const M: Record<string, string[]> = {
      DIRECTOR:        ['DIRECTOR','SERVICE_MANAGER','SECRETARY','STAFF'],
      SERVICE_MANAGER: ['DIRECTOR','SERVICE_MANAGER','SECRETARY','STAFF'],
      SECRETARY:       ['DIRECTOR','SERVICE_MANAGER','STAFF'],
      STAFF:           ['DIRECTOR','SERVICE_MANAGER','SECRETARY','PARENT'],
      PARENT:          ['STAFF'],
      CHILD:           [],
    };
    // si c'est STAFF ↔ PARENT ou PARENT ↔ STAFF, on valide plus haut via referents
    return M[senderRole]?.includes(receiverRole) ?? false;
  }
}
