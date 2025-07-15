// backend/src/chat/chat.service.ts
import {
    Injectable,
    ForbiddenException,
    NotFoundException,
  } from '@nestjs/common';
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
      private readonly prisma: PrismaService,
    ) {}
  
    /* ---------- création et accès de base ---------------------------------- */
  
    async createChat(participants: string[], userId: string, role: string) {
      for (const targetId of participants) {
        if (targetId === userId) continue;
  
        const target = await this.prisma.user.findUnique({
          where: { id: targetId },
          select: { id: true, role: true },
        });
  
        if (!target || !this.isAllowed(role, target.role, userId, target.id)) {
          throw new ForbiddenException('Conversation non autorisée');
        }
      }
  
      return this.chatModel.create({ participants });
    }
  
    findAllForUser(userId: string) {
      return this.chatModel.find({ participants: userId }).exec();
    }
  
    async canAccessChat(userId: string, chatId: string) {
      const chat = await this.chatModel.findById(chatId).exec();
      if (!chat) throw new NotFoundException('Chat introuvable');
      return (chat.participants as string[]).includes(userId);
    }
  
    async createMessage(chatId: string, authorId: string, content: string) {
      if (!(await this.canAccessChat(authorId, chatId))) {
        throw new ForbiddenException('Accès refusé à ce chat');
      }
      return this.msgModel.create({
        chat: new Types.ObjectId(chatId),
        author: authorId,
        content,
      });
    }
  
    getMessages(chatId: string, limit = 50, before?: Date) {
      const filter: any = { chat: chatId };
      if (before) filter.sentAt = { $lt: before };
      return this.msgModel
        .find(filter)
        .sort({ sentAt: -1 })
        .limit(limit)
        .exec();
    }
  
    /* ---------- contacts autorisés ---------------------------------------- */
  
    async getAllowedContacts(userId: string, role: string): Promise<Contact[]> {
      switch (role) {
        case 'DIRECTOR':
        case 'SERVICE_MANAGER':
          return this.prisma.user
            .findMany({
              where: {
                role: { in: ['DIRECTOR', 'SERVICE_MANAGER', 'SECRETARY', 'STAFF'] },
              },
              select: { id: true, email: true, role: true },
            })
            .then((u) => u.map((m) => ({ id: m.id, name: m.email, role: m.role })));
  
        case 'SECRETARY':
          return this.prisma.user
            .findMany({
              where: { role: { in: ['DIRECTOR', 'SERVICE_MANAGER', 'STAFF'] } },
              select: { id: true, email: true, role: true },
            })
            .then((u) => u.map((m) => ({ id: m.id, name: m.email, role: m.role })));
  
        case 'STAFF':
          return this.getStaffContacts(userId);
  
        case 'PARENT':
          return this.getParentContacts(userId);
  
        default:
          return [];
      }
    }
  
    private async getStaffContacts(staffId: string): Promise<Contact[]> {
      const admins = await this.prisma.user.findMany({
        where: { role: { in: ['DIRECTOR', 'SERVICE_MANAGER', 'SECRETARY'] } },
        select: { id: true, email: true, role: true },
      });
  
      const children = await this.prisma.child.findMany({
        where: { referents: { some: { id: staffId } } },
        include: {
          parent: {
            select: { user: { select: { id: true, email: true, role: true } } },
          },
        },
      });
  
      const parents = children.map((c) => c.parent.user);
      const uniqueParents = Array.from(new Map(parents.map((p) => [p.id, p])).values());
  
      return [
        ...admins.map((a) => ({ id: a.id, name: a.email, role: a.role })),
        ...uniqueParents.map((p) => ({ id: p.id, name: p.email, role: p.role })),
      ];
    }
  
    private async getParentContacts(parentUserId: string): Promise<Contact[]> {
      const children = await this.prisma.child.findMany({
        where: { parent: { userId: parentUserId } },
        include: { referents: { select: { id: true, email: true, role: true } } },
      });
  
      const referents = children.flatMap((c) => c.referents);
      const unique = Array.from(new Map(referents.map((u) => [u.id, u])).values());
  
      return unique.map((u) => ({ id: u.id, name: u.email, role: u.role }));
    }
  
    /* ---------- matrice -------------------------------- */
  
    private isAllowed(senderRole: string, receiverRole: string, _s: string, _r: string) {
      const M: Record<string, string[]> = {
        DIRECTOR: ['DIRECTOR', 'SERVICE_MANAGER', 'SECRETARY', 'STAFF'],
        SERVICE_MANAGER: ['DIRECTOR', 'SERVICE_MANAGER', 'SECRETARY', 'STAFF'],
        SECRETARY: ['DIRECTOR', 'SERVICE_MANAGER', 'STAFF'],
        STAFF: ['DIRECTOR', 'SERVICE_MANAGER', 'SECRETARY', 'PARENT'],
        PARENT: ['STAFF'],
        CHILD: [],
      };
      return M[senderRole]?.includes(receiverRole) ?? false;
    }
  }
  