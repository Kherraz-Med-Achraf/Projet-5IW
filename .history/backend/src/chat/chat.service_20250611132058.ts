// backend/src/chat/chat.service.ts
import {
    Injectable, ForbiddenException, NotFoundException,
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
  
    /* ---------- util  ------------------------------------------------------ */
    /** Concatène firstName + lastName depuis n’importe quel profil utilisateur */
    private fullName(u: any): string {
      const fn =
        u.directorProfile?.firstName ??
        u.serviceManagerProfile?.firstName ??
        u.secretaryProfile?.firstName ??
        u.staffProfile?.firstName ??
        u.parentProfile?.firstName ??
        '';
      const ln =
        u.directorProfile?.lastName ??
        u.serviceManagerProfile?.lastName ??
        u.secretaryProfile?.lastName ??
        u.staffProfile?.lastName ??
        u.parentProfile?.lastName ??
        '';
      return `${fn} ${ln}`.trim() || u.email;
    }
  
    /* ---------- création & messages --------------------------------------- */
  
    async createChat(participants: string[], userId: string, role: string) {
      for (const targetId of participants) {
        if (targetId === userId) continue;
        const tgt = await this.prisma.user.findUnique({
          where: { id: targetId },
          select: { id: true, role: true },
        });
        if (!tgt || !this.isAllowed(role, tgt.role)) {
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
      return chat.participants.some((p: any) => p.toString() === userId);
    }
  
    async createMessage(chatId: string, authorId: string, content: string) {
      if (!(await this.canAccessChat(authorId, chatId))) {
        throw new ForbiddenException('Accès refusé');
      }
      return this.msgModel.create({
        chat: new Types.ObjectId(chatId),
        author: authorId,
        content,
      });
    }
  
    getMessages(chatId: string, limit = 50, before?: Date) {
      const f: any = { chat: new Types.ObjectId(chatId) };
      if (before) f.sentAt = { $lt: before };
      return this.msgModel.find(f).sort({ sentAt: 1 }).limit(limit).exec();
    }
  
    /* ---------- contacts autorisés ---------------------------------------- */
  
    async getAllowedContacts(userId: string, role: string): Promise<Contact[]> {
      switch (role) {
        case 'DIRECTOR':
        case 'SERVICE_MANAGER':
          return this.prisma.user
            .findMany({
              where: { role: { in: ['DIRECTOR', 'SERVICE_MANAGER', 'SECRETARY', 'STAFF'] } },
              include: {
                directorProfile:       { select: { firstName:true,lastName:true } },
                serviceManagerProfile: { select: { firstName:true,lastName:true } },
                secretaryProfile:      { select: { firstName:true,lastName:true } },
                staffProfile:          { select: { firstName:true,lastName:true } },
              },
            })
            .then(u => u.map(m => ({ id: m.id, name: this.fullName(m), role: m.role })));
  
        case 'SECRETARY':
          return this.prisma.user
            .findMany({
              where: { role: { in: ['DIRECTOR','SERVICE_MANAGER','STAFF'] } },
              include: {
                directorProfile:       { select: { firstName:true,lastName:true } },
                serviceManagerProfile: { select: { firstName:true,lastName:true } },
                staffProfile:          { select: { firstName:true,lastName:true } },
              },
            })
            .then(u => u.map(m => ({ id: m.id, name: this.fullName(m), role: m.role })));
  
        case 'STAFF':
          return this.getStaffContacts(userId);
  
        case 'PARENT':
          return this.getParentContacts(userId);
  
        default:
          return [];
      }
    }
  
    /** STAFF → Admins + parents des enfants dont il est référent */
    private async getStaffContacts(staffId: string): Promise<Contact[]> {
      const admins = await this.prisma.user.findMany({
        where: { role: { in: ['DIRECTOR','SERVICE_MANAGER','SECRETARY'] } },
        include: {
          directorProfile:       { select: { firstName:true,lastName:true } },
          serviceManagerProfile: { select: { firstName:true,lastName:true } },
          secretaryProfile:      { select: { firstName:true,lastName:true } },
        },
      });
  
      const children = await this.prisma.child.findMany({
        where: { referents: { some: { id: staffId } } },
        include: {
          parent: {
            include: {
              user: {
                include: { parentProfile: { select:{ firstName:true,lastName:true } } },
              },
            },
          },
        },
      });
  
      const parents = children.map(c => c.parent.user);
      const uniqPar = Array.from(new Map(parents.map(p => [p.id, p])).values());
  
      return [
        ...admins.map(a => ({ id: a.id, name: this.fullName(a), role: a.role })),
        ...uniqPar.map(p => ({ id: p.id, name: this.fullName(p), role: p.role })),
      ];
    }
  
    /** PARENT → staff référents de ses enfants */
    private async getParentContacts(parentUserId: string): Promise<Contact[]> {
      const children = await this.prisma.child.findMany({
        where: { parent: { userId: parentUserId } },
        include: {
          referents: {
            include: { staffProfile: { select: { firstName:true,lastName:true } } },
          },
        },
      });
  
      const referents = children.flatMap(c => c.referents);
      const uniq = Array.from(new Map(referents.map(u => [u.id, u])).values());
      return uniq.map(u => ({ id: u.id, name: this.fullName(u), role: u.role }));
    }
  
    /* ---------- matrice rôle → rôle --------------------------------------- */
    private isAllowed(senderRole: string, receiverRole: string) {
      const M: Record<string, string[]> = {
        DIRECTOR:        ['DIRECTOR','SERVICE_MANAGER','SECRETARY','STAFF'],
        SERVICE_MANAGER: ['DIRECTOR','SERVICE_MANAGER','SECRETARY','STAFF'],
        SECRETARY:       ['DIRECTOR','SERVICE_MANAGER','STAFF'],
        STAFF:           ['DIRECTOR','SERVICE_MANAGER','SECRETARY','PARENT'],
        PARENT:          ['STAFF'],
        CHILD:           [],
      };
      return M[senderRole]?.includes(receiverRole) ?? false;
    }
  }
  