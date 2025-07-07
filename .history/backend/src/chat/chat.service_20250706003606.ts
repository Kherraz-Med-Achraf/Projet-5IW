import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { PrismaService } from '../prisma/prisma.service';
import { Chat } from './schemas/chat.schema';
import { Message } from './schemas/message.schema';
import * as sanitizeHtml from 'sanitize-html';

type Contact = { id: string; name: string; role: string };

// Utilitaires de validation sécurisée
class SecurityValidator {
  /**
   * Validation stricte des ObjectIds MongoDB avec vérifications supplémentaires
   */
  static validateObjectId(id: string, context: string = 'Object'): void {
    if (!id) {
      throw new BadRequestException(`${context} ID manquant`);
    }
    
    if (typeof id !== 'string') {
      throw new BadRequestException(`${context} ID doit être une chaîne`);
    }
    
    // Vérification de la longueur (ObjectIds MongoDB = 24 caractères hexadécimaux)
    if (id.length !== 24) {
      throw new BadRequestException(`${context} ID invalide: longueur incorrecte`);
    }
    
    // Vérification que c'est uniquement des caractères hexadécimaux
    if (!/^[0-9a-fA-F]{24}$/.test(id)) {
      throw new BadRequestException(`${context} ID invalide: format incorrect`);
    }
    
    // Validation MongoDB native
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`${context} ID invalide: échec validation MongoDB`);
    }
    
    // Vérification que l'ID n'est pas un ObjectId "zero" ou suspect
    const objectId = new Types.ObjectId(id);
    if (objectId.toString() === '000000000000000000000000') {
      throw new BadRequestException(`${context} ID invalide: ID réservé`);
    }
  }

  /**
   * Validation des IDs utilisateur avec vérification de format
   */
  static validateUserId(userId: string): void {
    if (!userId) {
      throw new BadRequestException('User ID manquant');
    }
    
    if (typeof userId !== 'string') {
      throw new BadRequestException('User ID doit être une chaîne');
    }
    
    // Validation du format CUID (format utilisé par Prisma)
    if (!/^[a-z0-9]{25}$/.test(userId)) {
      throw new BadRequestException('User ID invalide: format CUID requis');
    }
  }

  /**
   * Validation des participants d'un chat
   */
  static validateParticipants(participants: string[]): void {
    if (!Array.isArray(participants)) {
      throw new BadRequestException('Participants doit être un tableau');
    }
    
    if (participants.length !== 2) {
      throw new BadRequestException('Exactement 2 participants requis');
    }
    
    participants.forEach((id, index) => {
      this.validateUserId(id);
    });
    
    // Vérifier qu'il n'y a pas de doublons
    const uniqueParticipants = new Set(participants);
    if (uniqueParticipants.size !== participants.length) {
      throw new BadRequestException('Participants dupliqués détectés');
    }
  }
}

@Injectable()
export class ChatService {
  constructor(
    @InjectModel(Chat.name) public readonly chatModel: Model<Chat>,
    @InjectModel(Message.name) private msgModel: Model<Message>,
    private readonly prisma: PrismaService,
  ) {}

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

  async createChat(participants: string[], userId: string, role: string) {
    // Validation sécurisée des entrées
    SecurityValidator.validateUserId(userId);
    SecurityValidator.validateParticipants(participants);
    
    // Assure que l'appelant est présent
    if (!participants.includes(userId)) {
      participants.push(userId);
    }

    // Enlève doublons et trie pour uniformiser la clé d'unicité
    const uniquePart = Array.from(new Set(participants)).sort();

    // Le chat doit impérativement être entre deux personnes exactement
    if (uniquePart.length !== 2) {
      throw new ForbiddenException('Conversation non autorisée');
    }

    // Vérifie les autorisations pour chaque destinataire avec validation renforcée
    for (const targetId of uniquePart) {
      if (targetId === userId) continue;
      
      SecurityValidator.validateUserId(targetId);
      
      const tgt = await this.prisma.user.findUnique({
        where: { id: targetId },
        select: { id: true, role: true },
      });
      
      if (!tgt) {
        throw new ForbiddenException('Utilisateur cible introuvable');
      }
      
      if (!this.isAllowed(role, tgt.role)) {
        throw new ForbiddenException('Conversation non autorisée entre ces rôles');
      }
    }

    // Empêche les doublons : recherche d'un chat existant avec exactement ces participants
    const existing = await this.chatModel
      .findOne({ participants: uniquePart })
      .exec();
    if (existing) return existing;

    return this.chatModel.create({ participants: uniquePart });
  }

  async findAllForUser(userId: string) {
    const chats = await this.chatModel.find({ participants: userId }).exec();

    const results = await Promise.all(
      chats.map(async (chat) => {
        // Dernier message pour l'aperçu et la date de mise à jour
        const lastMessage = await this.msgModel
          .findOne({ chat: chat._id })
          .sort({ sentAt: -1 })
          .exec();

        // Date de dernière lecture stockée (par défaut 1970 si non lue)
        let lastRead: Date = new Date(0);
        const lrField: any = (chat as any).lastReads;
        if (lrField) {
          // Le champ est un Map ou un objet simple selon mongoose
          if (typeof lrField.get === 'function') {
            lastRead = lrField.get(userId) ?? new Date(0);
          } else if (lrField[userId]) {
            lastRead = lrField[userId] as Date;
          }
        }

        // Nombre de messages non lus (hors messages de l'utilisateur)
        const unreadCount = await this.msgModel.countDocuments({
          chat: chat._id,
          author: { $ne: userId },
          sentAt: { $gt: lastRead },
        });

        return {
          ...chat.toObject(),
          lastMessage: lastMessage?.content || null,
          updatedAt: lastMessage?.sentAt || chat.updatedAt,
          unreadCount,
        };
      }),
    );

    return results;
  }

  async canAccessChat(userId: string, chatId: string) {
    // Validation sécurisée des entrées
    SecurityValidator.validateUserId(userId);
    SecurityValidator.validateObjectId(chatId, 'Chat');
    
    const chat = await this.chatModel.findById(chatId).exec();
    if (!chat) {
      return false; // Évite la fuite d'information sur l'existence des salons
    }
    return chat.participants.some((p: any) => p.toString() === userId);
  }

  async createMessage(chatId: string, authorId: string, content: string) {
    // Validation sécurisée des entrées
    SecurityValidator.validateObjectId(chatId, 'Chat');
    SecurityValidator.validateUserId(authorId);
    
    if (!content || typeof content !== 'string') {
      throw new BadRequestException('Contenu du message invalide');
    }
    
    if (!(await this.canAccessChat(authorId, chatId))) {
      throw new ForbiddenException('Accès refusé');
    }
    
    const clean = sanitizeHtml(content, {
      allowedTags: [],
      allowedAttributes: {},
      allowedSchemes: ['http', 'https', 'mailto'],
    })
      .replace(/[\u202A-\u202E\u2066-\u2069]/g, '') // Supprime les caractères de contrôle bidirectionnels
      .replace(/[\x00-\x1F\x7F-\x9F]/g, '') // Supprime les caractères de contrôle
      .slice(0, 1000);
      
    const trimmed = clean.trim();
    if (!trimmed) {
      throw new BadRequestException('Message vide après nettoyage');
    }
    
    // Validation supplémentaire contre le spam
    if (trimmed.length < 1 || trimmed.length > 1000) {
      throw new BadRequestException('Longueur du message invalide');
    }
    
    const msg = await this.msgModel.create({
      chat: new Types.ObjectId(chatId),
      author: authorId,
      content: trimmed,
    });
    
    await this.chatModel.findByIdAndUpdate(chatId, { updatedAt: msg.sentAt });
    return msg;
  }

  async updateMessage(chatId: string, msgId: string, userId: string, content: string) {
    // Validation sécurisée des entrées
    SecurityValidator.validateObjectId(chatId, 'Chat');
    SecurityValidator.validateObjectId(msgId, 'Message');
    SecurityValidator.validateUserId(userId);
    
    if (!content || typeof content !== 'string') {
      throw new BadRequestException('Contenu du message invalide');
    }
    
    if (!(await this.canAccessChat(userId, chatId))) {
      throw new ForbiddenException('Accès refusé');
    }

    const msg = await this.msgModel.findById(msgId).exec();
    if (!msg) throw new NotFoundException('Message introuvable');
    if (msg.author !== userId) {
      throw new ForbiddenException('Vous ne pouvez modifier que vos messages');
    }
    if (msg.chat.toString() !== chatId) {
      throw new ForbiddenException('Message hors de ce chat');
    }

    const clean = sanitizeHtml(content, {
      allowedTags: [],
      allowedAttributes: {},
      allowedSchemes: ['http', 'https', 'mailto'],
    })
      .replace(/[\u202A-\u202E\u2066-\u2069]/g, '')
      .replace(/[\x00-\x1F\x7F-\x9F]/g, '')
      .slice(0, 1000);
      
    const trimmed = clean.trim();
    if (!trimmed) {
      throw new BadRequestException('Message vide après nettoyage');
    }

    msg.content = trimmed;
    msg.editedAt = new Date();
    await msg.save();
    return msg;
  }

  async deleteMessage(chatId: string, msgId: string, userId: string) {
    // Validation sécurisée des entrées
    SecurityValidator.validateObjectId(chatId, 'Chat');
    SecurityValidator.validateObjectId(msgId, 'Message');
    SecurityValidator.validateUserId(userId);
    
    if (!(await this.canAccessChat(userId, chatId))) {
      throw new ForbiddenException('Accès refusé');
    }

    const msg = await this.msgModel.findById(msgId).exec();
    if (!msg) throw new NotFoundException('Message introuvable');
    if (msg.author !== userId) {
      throw new ForbiddenException('Vous ne pouvez supprimer que vos messages');
    }
    if (msg.chat.toString() !== chatId) {
      throw new ForbiddenException('Message hors de ce chat');
    }

    await msg.deleteOne();
    return msgId;
  }

  getMessages(chatId: string, limit = 50, before?: Date) {
    const filter: any = { chat: new Types.ObjectId(chatId) };
    if (before) filter.sentAt = { $lt: before };
    return this.msgModel.find(filter).sort({ sentAt: 1 }).limit(limit).exec();
  }

  async getAllowedContacts(userId: string, role: string): Promise<Contact[]> {
    switch (role) {
      case 'DIRECTOR':
      case 'SERVICE_MANAGER':
        return this.prisma.user
          .findMany({
            where: {
              role: {
                in: ['DIRECTOR', 'SERVICE_MANAGER', 'SECRETARY', 'STAFF'],
              },
            },
            include: {
              directorProfile: { select: { firstName: true, lastName: true } },
              serviceManagerProfile: {
                select: { firstName: true, lastName: true },
              },
              secretaryProfile: { select: { firstName: true, lastName: true } },
              staffProfile: { select: { firstName: true, lastName: true } },
              parentProfile: { select: { firstName: true, lastName: true } },
            },
          })
          .then((users) =>
            users.map((u) => ({
              id: u.id,
              name: this.fullName(u),
              role: u.role,
            })),
          );

      case 'SECRETARY':
        return this.prisma.user
          .findMany({
            where: { role: { in: ['DIRECTOR', 'SERVICE_MANAGER', 'STAFF'] } },
            include: {
              directorProfile: { select: { firstName: true, lastName: true } },
              serviceManagerProfile: {
                select: { firstName: true, lastName: true },
              },
              staffProfile: { select: { firstName: true, lastName: true } },
            },
          })
          .then((users) =>
            users.map((u) => ({
              id: u.id,
              name: this.fullName(u),
              role: u.role,
            })),
          );

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
      include: {
        directorProfile: { select: { firstName: true, lastName: true } },
        serviceManagerProfile: { select: { firstName: true, lastName: true } },
        secretaryProfile: { select: { firstName: true, lastName: true } },
      },
    });

    const children = await this.prisma.child.findMany({
      where: { referents: { some: { id: staffId } } },
      include: {
        parent: {
          include: {
            user: {
              include: {
                parentProfile: { select: { firstName: true, lastName: true } },
              },
            },
          },
        },
      },
    });

    const parents = children.map((c) => c.parent.user);
    const uniqueParents = Array.from(
      new Map(parents.map((p) => [p.id, p])).values(),
    );

    return [
      ...admins.map((a) => ({
        id: a.id,
        name: this.fullName(a),
        role: a.role,
      })),
      ...uniqueParents.map((p) => ({
        id: p.id,
        name: this.fullName(p),
        role: p.role,
      })),
    ];
  }

  private async getParentContacts(parentUserId: string): Promise<Contact[]> {
    const children = await this.prisma.child.findMany({
      where: { parent: { userId: parentUserId } },
      include: {
        referents: {
          include: {
            staffProfile: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });

    const referents = children.flatMap((c) => c.referents);
    const unique = Array.from(
      new Map(referents.map((u) => [u.id, u])).values(),
    );

    return unique.map((u) => ({
      id: u.id,
      name: this.fullName(u),
      role: u.role,
    }));
  }

  private isAllowed(senderRole: string, receiverRole: string) {
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

  async markAsRead(chatId: string, userId: string) {
    // Validation sécurisée des entrées
    SecurityValidator.validateObjectId(chatId, 'Chat');
    SecurityValidator.validateUserId(userId);
    
    if (!(await this.canAccessChat(userId, chatId))) {
      throw new ForbiddenException('Accès refusé');
    }

    await this.chatModel.findByIdAndUpdate(chatId, {
      [`lastReads.${userId}`]: new Date(),
    });
  }
}
