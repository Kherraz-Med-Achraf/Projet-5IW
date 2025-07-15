import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { PrismaService } from '../prisma/prisma.service';
import { Chat } from './schemas/chat.schema';
import { Message } from './schemas/message.schema';
import * as sanitizeHtml from 'sanitize-html';

type Contact = { id: string; name: string; role: string };

// Service de logging sécurisé pour le chat
class ChatSecurityLogger {
  private static readonly logger = new Logger('ChatSecurity');

  static logSuspiciousActivity(
    action: string,
    userId: string,
    details: Record<string, any>,
    severity: 'LOW' | 'MEDIUM' | 'HIGH' = 'MEDIUM'
  ) {
    const logData = {
      timestamp: new Date().toISOString(),
      severity,
      action,
      userId,
      details,
    };
    
    if (severity === 'HIGH') {
      this.logger.error(`[SECURITY ALERT] ${action}`, logData);
    } else if (severity === 'MEDIUM') {
      this.logger.warn(`[SECURITY WARNING] ${action}`, logData);
    } else {
      this.logger.log(`[SECURITY INFO] ${action}`, logData);
    }
  }

  static logUserAction(
    action: string,
    userId: string,
    resourceId?: string,
    metadata?: Record<string, any>
  ) {
    const logData = {
      timestamp: new Date().toISOString(),
      action,
      userId,
      resourceId,
      metadata,
    };
    
    this.logger.log(`[USER ACTION] ${action}`, logData);
  }

  static logSystemEvent(
    event: string,
    details: Record<string, any>
  ) {
    const logData = {
      timestamp: new Date().toISOString(),
      event,
      details,
    };
    
    this.logger.log(`[SYSTEM EVENT] ${event}`, logData);
  }

  static logAccessControl(
    userId: string,
    resource: string,
    action: string,
    granted: boolean,
    reason?: string
  ) {
    const logData = {
      timestamp: new Date().toISOString(),
      userId,
      resource,
      action,
      granted,
      reason,
    };
    
    if (!granted) {
      this.logger.warn(`[ACCESS DENIED] ${action} on ${resource}`, logData);
    } else {
      this.logger.log(`[ACCESS GRANTED] ${action} on ${resource}`, logData);
    }
  }
}

// Utilitaires de validation sécurisée
class SecurityValidator {
  /**
   * Validation stricte des ObjectIds MongoDB avec vérifications supplémentaires
   */
  static validateObjectId(id: string, context: string = 'Object'): void {
    if (!id) {
      ChatSecurityLogger.logSuspiciousActivity(
        'INVALID_OBJECT_ID',
        'unknown',
        { context, id: 'null_or_undefined' },
        'MEDIUM'
      );
      throw new BadRequestException(`${context} ID manquant`);
    }
    
    if (typeof id !== 'string') {
      ChatSecurityLogger.logSuspiciousActivity(
        'INVALID_OBJECT_ID_TYPE',
        'unknown',
        { context, type: typeof id },
        'MEDIUM'
      );
      throw new BadRequestException(`${context} ID doit être une chaîne`);
    }
    
    // Vérification de la longueur (ObjectIds MongoDB = 24 caractères hexadécimaux)
    if (id.length !== 24) {
      ChatSecurityLogger.logSuspiciousActivity(
        'INVALID_OBJECT_ID_LENGTH',
        'unknown',
        { context, id, length: id.length },
        'HIGH'
      );
      throw new BadRequestException(`${context} ID invalide: longueur incorrecte`);
    }
    
    // Vérification que c'est uniquement des caractères hexadécimaux
    if (!/^[0-9a-fA-F]{24}$/.test(id)) {
      ChatSecurityLogger.logSuspiciousActivity(
        'INVALID_OBJECT_ID_FORMAT',
        'unknown',
        { context, id },
        'HIGH'
      );
      throw new BadRequestException(`${context} ID invalide: format incorrect`);
    }
    
    // Validation MongoDB native
    if (!Types.ObjectId.isValid(id)) {
      ChatSecurityLogger.logSuspiciousActivity(
        'MONGODB_VALIDATION_FAILED',
        'unknown',
        { context, id },
        'HIGH'
      );
      throw new BadRequestException(`${context} ID invalide: échec validation MongoDB`);
    }
    
    // Vérification que l'ID n'est pas un ObjectId "zero" ou suspect
    const objectId = new Types.ObjectId(id);
    if (objectId.toString() === '000000000000000000000000') {
      ChatSecurityLogger.logSuspiciousActivity(
        'SUSPICIOUS_OBJECT_ID',
        'unknown',
        { context, id, reason: 'zero_id' },
        'HIGH'
      );
      throw new BadRequestException(`${context} ID invalide: ID réservé`);
    }
  }

  /**
   * Validation des IDs utilisateur avec vérification de format
   */
  static validateUserId(userId: string): void {
    if (!userId) {
      ChatSecurityLogger.logSuspiciousActivity(
        'INVALID_USER_ID',
        'unknown',
        { userId: 'null_or_undefined' },
        'MEDIUM'
      );
      throw new BadRequestException('User ID manquant');
    }
    
    if (typeof userId !== 'string') {
      ChatSecurityLogger.logSuspiciousActivity(
        'INVALID_USER_ID_TYPE',
        userId,
        { type: typeof userId },
        'MEDIUM'
      );
      throw new BadRequestException('User ID doit être une chaîne');
    }
    
    // Validation du format CUID (format utilisé par Prisma)
    if (!/^[a-z0-9]{25}$/.test(userId)) {
      ChatSecurityLogger.logSuspiciousActivity(
        'INVALID_USER_ID_FORMAT',
        userId,
        { userId, format: 'cuid_expected' },
        'HIGH'
      );
      throw new BadRequestException('User ID invalide: format CUID requis');
    }
  }

  /**
   * Validation des participants d'un chat
   */
  static validateParticipants(participants: string[]): void {
    if (!Array.isArray(participants)) {
      ChatSecurityLogger.logSuspiciousActivity(
        'INVALID_PARTICIPANTS_TYPE',
        'unknown',
        { type: typeof participants },
        'MEDIUM'
      );
      throw new BadRequestException('Participants doit être un tableau');
    }
    
    if (participants.length !== 2) {
      ChatSecurityLogger.logSuspiciousActivity(
        'INVALID_PARTICIPANTS_COUNT',
        'unknown',
        { count: participants.length, participants },
        'HIGH'
      );
      throw new BadRequestException('Exactement 2 participants requis');
    }
    
    participants.forEach((id, index) => {
      this.validateUserId(id);
    });
    
    // Vérifier qu'il n'y a pas de doublons
    const uniqueParticipants = new Set(participants);
    if (uniqueParticipants.size !== participants.length) {
      ChatSecurityLogger.logSuspiciousActivity(
        'DUPLICATE_PARTICIPANTS',
        'unknown',
        { participants },
        'HIGH'
      );
      throw new BadRequestException('Participants dupliqués détectés');
    }
  }
}

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

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
      ChatSecurityLogger.logSuspiciousActivity(
        'INVALID_MESSAGE_CONTENT',
        authorId,
        { chatId, contentType: typeof content },
        'MEDIUM'
      );
      throw new BadRequestException('Contenu du message invalide');
    }
    
    ChatSecurityLogger.logUserAction('CREATE_MESSAGE_ATTEMPT', authorId, chatId, {
      contentLength: content.length
    });
    
    if (!(await this.canAccessChat(authorId, chatId))) {
      ChatSecurityLogger.logSuspiciousActivity(
        'UNAUTHORIZED_MESSAGE_CREATION',
        authorId,
        { chatId },
        'HIGH'
      );
      throw new ForbiddenException('Accès refusé');
    }
    
    const originalLength = content.length;
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
      ChatSecurityLogger.logSuspiciousActivity(
        'EMPTY_MESSAGE_AFTER_SANITIZATION',
        authorId,
        { chatId, originalLength, cleanedLength: clean.length },
        'MEDIUM'
      );
      throw new BadRequestException('Message vide après nettoyage');
    }
    
    // Validation supplémentaire contre le spam
    if (trimmed.length < 1 || trimmed.length > 1000) {
      ChatSecurityLogger.logSuspiciousActivity(
        'MESSAGE_LENGTH_VIOLATION',
        authorId,
        { chatId, length: trimmed.length },
        'MEDIUM'
      );
      throw new BadRequestException('Longueur du message invalide');
    }
    
    const msg = await this.msgModel.create({
      chat: new Types.ObjectId(chatId),
      author: authorId,
      content: trimmed,
    });
    
    await this.chatModel.findByIdAndUpdate(chatId, { updatedAt: msg.sentAt });
    
    ChatSecurityLogger.logUserAction('MESSAGE_CREATED', authorId, msg.id.toString(), {
      chatId,
      contentLength: trimmed.length,
      sanitized: originalLength !== trimmed.length
    });
    
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
    (msg as any).editedAt = new Date();
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
    let contacts: Contact[] = [];
    
    switch (role) {
      case 'DIRECTOR':
      case 'SERVICE_MANAGER':
        const adminUsers = await this.prisma.user
          .findMany({
            where: {
              role: {
                in: ['DIRECTOR', 'SERVICE_MANAGER', 'SECRETARY', 'STAFF'],
              },
              id: { not: userId }, // Exclure l'utilisateur actuel
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
          });
        
        contacts = adminUsers.map((u) => ({
          id: u.id,
          name: this.fullName(u),
          role: u.role,
        }));
        break;

      case 'SECRETARY':
        const secretaryUsers = await this.prisma.user
          .findMany({
            where: { 
              role: { in: ['DIRECTOR', 'SERVICE_MANAGER', 'STAFF'] },
              id: { not: userId }, // Exclure l'utilisateur actuel
            },
            include: {
              directorProfile: { select: { firstName: true, lastName: true } },
              serviceManagerProfile: {
                select: { firstName: true, lastName: true },
              },
              staffProfile: { select: { firstName: true, lastName: true } },
            },
          });
        
        contacts = secretaryUsers.map((u) => ({
          id: u.id,
          name: this.fullName(u),
          role: u.role,
        }));
        break;

      case 'STAFF':
        contacts = await this.getStaffContacts(userId);
        break;

      case 'PARENT':
        contacts = await this.getParentContacts(userId);
        break;

      default:
        contacts = [];
    }

    // Déduplication finale basée sur l'ID avec tri par nom
    const uniqueContacts = Array.from(
      new Map(contacts.map((c) => [c.id, c])).values(),
    ).sort((a, b) => a.name.localeCompare(b.name));

    return uniqueContacts;
  }

  private async getStaffContacts(staffId: string): Promise<Contact[]> {
    const admins = await this.prisma.user.findMany({
      where: { 
        role: { in: ['DIRECTOR', 'SERVICE_MANAGER', 'SECRETARY'] },
        id: { not: staffId }, // Exclure l'utilisateur actuel
      },
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

    const adminContacts = admins.map((a) => ({
      id: a.id,
      name: this.fullName(a),
      role: a.role,
    }));

    const parentContacts = uniqueParents.map((p) => ({
      id: p.id,
      name: this.fullName(p),
      role: p.role,
    }));

    return [...adminContacts, ...parentContacts];
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
