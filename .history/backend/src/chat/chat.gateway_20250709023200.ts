import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ChatService } from './chat.service';
import { Throttle } from '@nestjs/throttler';
import { PrismaService } from '../prisma/prisma.service';
import { Types } from 'mongoose';
import { UseGuards } from '@nestjs/common';
import { WsThrottlerGuard } from '../common/guards/ws-throttler.guard';
import { FRONTEND_BASE_URL } from '../utils/frontend-url';

@UseGuards(WsThrottlerGuard)
@WebSocketGateway({
  namespace: '/chat',
  cors: {
    origin: [
      'http://localhost:5173',
      'https://educareschool.me',
      'https://api.educareschool.me',
      process.env.FRONTEND_ORIGIN || FRONTEND_BASE_URL,
      FRONTEND_BASE_URL.replace('http://', 'https://'),
    ],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  // Limites de sécurité renforcées
  private readonly userRoomCount = new Map<string, number>();
  private readonly MAX_ROOMS_PER_USER = 10; // Réduit de 500 à 10
  private readonly MAX_CONNECTIONS_PER_USER = 3; // Nouveau: limite de connexions simultanées
  private readonly userConnections = new Map<string, Set<string>>(); // Track connections par user

  // Métriques de sécurité
  private readonly suspiciousActivity = new Map<
    string,
    {
      failedAttempts: number;
      lastAttempt: Date;
      blocked: boolean;
    }
  >();

  constructor(
    private readonly jwtService: JwtService,
    private readonly chatService: ChatService,
    private readonly prisma: PrismaService,
  ) {}

  async handleConnection(@ConnectedSocket() socket: Socket) {
    const token = socket.handshake.auth?.token;
    const clientIp = socket.handshake.address;

    if (!token) {
      console.warn(
        `[SECURITY] Tentative de connexion sans token depuis ${clientIp}`,
      );
      return socket.disconnect();
    }

    try {
      const payload: any = this.jwtService.verify(token);
      const userId = payload.sub;

      // Vérification supplémentaire en base pour s'assurer que l'utilisateur existe encore
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, role: true, passwordChangedAt: true },
      });

      if (!user) {
        console.warn(
          `[AUTH] Utilisateur inexistant pour token: ${userId} depuis ${clientIp}`,
        );
        socket.emit('auth_error', { message: 'Session expirée, veuillez vous reconnecter' });
        return socket.disconnect();
      }

      // Invalide le token si le mot de passe a été changé après son émission
      if (
        user.passwordChangedAt &&
        payload.iat * 1000 < new Date(user.passwordChangedAt).getTime()
      ) {
        console.warn(
          `[SECURITY] Tentative de connexion avec token expiré (password changed) pour user ${userId} depuis ${clientIp}`,
        );
        this.recordSuspiciousActivity(clientIp, 'EXPIRED_TOKEN');
        return socket.disconnect();
      }

      // Vérifier si l'activité suspecte est bloquée
      if (this.isSuspiciousActivityBlocked(clientIp)) {
        console.warn(
          `[SECURITY] Connexion bloquée pour activité suspecte depuis ${clientIp}`,
        );
        return socket.disconnect();
      }

      // Limiter le nombre de connexions simultanées par utilisateur
      if (!this.userConnections.has(userId)) {
        this.userConnections.set(userId, new Set());
      }

      const userSockets = this.userConnections.get(userId)!;
      if (userSockets.size >= this.MAX_CONNECTIONS_PER_USER) {
        console.warn(
          `[SECURITY] Trop de connexions simultanées pour user ${userId} depuis ${clientIp}`,
        );
        this.recordSuspiciousActivity(clientIp, 'TOO_MANY_CONNECTIONS');
        return socket.disconnect();
      }

      socket.data.user = { id: user.id, role: user.role };
      socket.data.clientIp = clientIp;

      // Initialiser le compteur s'il n'existe pas encore
      if (!this.userRoomCount.has(user.id)) {
        this.userRoomCount.set(user.id, 0);
      }

      // Enregistrer la connexion
      userSockets.add(socket.id);

      // Room personnelle (pour recevoir newChat, etc.)
      socket.join(user.id);


    } catch (error) {
      console.error(
        `[SECURITY] Erreur lors de la connexion WebSocket depuis ${clientIp}:`,
        error.message,
      );
      this.recordSuspiciousActivity(clientIp, 'JWT_ERROR');
      return socket.disconnect();
    }
  }

  private recordSuspiciousActivity(clientIp: string, reason: string) {
    const activity = this.suspiciousActivity.get(clientIp) || {
      failedAttempts: 0,
      lastAttempt: new Date(),
      blocked: false,
    };

    activity.failedAttempts++;
    activity.lastAttempt = new Date();

    // Bloquer après 5 tentatives suspectes en 10 minutes
    if (activity.failedAttempts >= 5) {
      activity.blocked = true;
      console.error(
        `[SECURITY] IP ${clientIp} bloquée pour activité suspecte (raison: ${reason})`,
      );

      // Débloquer automatiquement après 30 minutes
      setTimeout(
        () => {
          this.suspiciousActivity.delete(clientIp);
          console.log(`[SECURITY] IP ${clientIp} débloquée automatiquement`);
        },
        30 * 60 * 1000,
      );
    }

    this.suspiciousActivity.set(clientIp, activity);
  }

  private isSuspiciousActivityBlocked(clientIp: string): boolean {
    const activity = this.suspiciousActivity.get(clientIp);
    if (!activity) return false;

    // Si bloqué et moins de 30 minutes se sont écoulées
    if (
      activity.blocked &&
      Date.now() - activity.lastAttempt.getTime() < 30 * 60 * 1000
    ) {
      return true;
    }

    // Reset si plus de 10 minutes se sont écoulées
    if (Date.now() - activity.lastAttempt.getTime() > 10 * 60 * 1000) {
      this.suspiciousActivity.delete(clientIp);
      return false;
    }

    return false;
  }

  handleDisconnect(@ConnectedSocket() socket: Socket) {
    const userId = socket?.data?.user?.id;
    const clientIp = socket?.data?.clientIp;

    if (!userId) return;

    // Supprimer de la liste des connexions
    const userSockets = this.userConnections.get(userId);
    if (userSockets) {
      userSockets.delete(socket.id);
      if (userSockets.size === 0) {
        this.userConnections.delete(userId);
      }
    }

    // Décrémenter du nombre de rooms (hors room par défaut)
    const roomsLeft = Array.from(socket.rooms).filter(
      (r) => r !== socket.id,
    ).length;
    const current = this.userRoomCount.get(userId) ?? 0;
    this.userRoomCount.set(userId, Math.max(current - roomsLeft, 0));


  }

  @Throttle({ join: { limit: 10, ttl: 60 } })
  @SubscribeMessage('joinChat')
  async onJoin(@ConnectedSocket() s: Socket, @MessageBody() chatId: string) {
    // Vérifier que l'utilisateur est bien authentifié
    if (!s.data?.user?.id) {
      console.warn(
        `[SECURITY] Tentative de join sans authentification valide depuis ${s.handshake.address}`,
      );
      return s.disconnect();
    }

    // Validation ObjectId
    if (!Types.ObjectId.isValid(chatId)) {
      console.warn(
        `[SECURITY] Tentative de join avec chatId invalide: ${chatId} par user ${s.data.user.id}`,
      );
      return;
    }

    const userId = s.data.user.id;

    // Limite réduite par utilisateur
    const current = this.userRoomCount.get(userId) ?? 0;
    if (current >= this.MAX_ROOMS_PER_USER) {
      console.warn(
        `[SECURITY] User ${userId} a atteint la limite de ${this.MAX_ROOMS_PER_USER} rooms`,
      );
      return;
    }

    if (await this.chatService.canAccessChat(userId, chatId)) {
      // Vérifier si l'utilisateur n'a pas déjà rejoint ce chat
      const alreadyInRoom = s.rooms.has(chatId);
      if (alreadyInRoom) {
        return;
      }
      
      s.join(chatId);
      this.userRoomCount.set(userId, current + 1);
    } else {
      console.warn(
        `[SECURITY] User ${userId} tentative d'accès non autorisé au chat ${chatId}`,
      );
    }
  }

  @SubscribeMessage('sendMessage')
  @Throttle({ send: { limit: 3, ttl: 10 } })
  async onMessage(
    @ConnectedSocket() s: Socket,
    @MessageBody() { chatId, content }: { chatId: string; content: string },
  ) {
    // Vérifier que l'utilisateur est bien authentifié
    if (!s.data?.user?.id) {
      console.warn(
        `[SECURITY] Tentative de sendMessage sans authentification valide depuis ${s.handshake.address}`,
      );
      return s.disconnect();
    }

    if (!Types.ObjectId.isValid(chatId)) {
      console.warn(
        `[SECURITY] Tentative de sendMessage avec chatId invalide: ${chatId} par user ${s.data.user.id}`,
      );
      return;
    }

    // Validation supplémentaire du contenu
    if (
      !content ||
      typeof content !== 'string' ||
      content.trim().length === 0
    ) {
      console.warn(
        `[SECURITY] Tentative d'envoi de message vide par user ${s.data.user.id}`,
      );
      return;
    }

    if (content.length > 1000) {
      console.warn(
        `[SECURITY] Tentative d'envoi de message trop long (${content.length} chars) par user ${s.data.user.id}`,
      );
      return;
    }

    try {
      const msg = await this.chatService.createMessage(
        chatId,
        s.data.user.id,
        content,
      );

      console.log(`[INFO] Émission newMessage vers room ${chatId} - msgId: ${msg.id}`);
      this.server.to(chatId).emit('newMessage', {
        chatId,
        msgId: msg.id,
        authorId: s.data.user.id,
        content: msg.content,
        sentAt: msg.sentAt,
      });

      // Notification pour les participants qui n'ont pas rejoint la room
      const chat = await this.chatService.chatModel
        .findById(chatId, { participants: 1 })
        .lean();

      if (chat) {
        const socketsInRoom = await this.server.in(chatId).fetchSockets();
        const userIdsInRoom = new Set<string>(
          socketsInRoom
            .map((sock) => sock?.data?.user?.id as string | undefined)
            .filter(Boolean) as string[],
        );

        chat.participants.forEach((uid: string) => {
          if (uid === s.data.user.id || userIdsInRoom.has(uid)) return;

          console.log(`[INFO] Envoi notification chatUpdated vers user ${uid}`);
          this.server.to(uid).emit('chatUpdated', {
            chatId,
            lastMessage: msg.content,
            authorId: s.data.user.id,
            sentAt: msg.sentAt,
          });
        });
      }
    } catch (error) {
      console.error(
        `[ERROR] Erreur lors de l'envoi du message par user ${s.data.user.id}:`,
        error.message,
      );
    }
  }

  @SubscribeMessage('editMessage')
  @Throttle({ edit: { limit: 3, ttl: 30 } })
  async onEdit(
    @ConnectedSocket() s: Socket,
    @MessageBody()
    {
      chatId,
      msgId,
      content,
    }: { chatId: string; msgId: string; content: string },
  ) {
    // Vérifier que l'utilisateur est bien authentifié
    if (!s.data?.user?.id) {
      console.warn(
        `[SECURITY] Tentative de editMessage sans authentification valide depuis ${s.handshake.address}`,
      );
      return s.disconnect();
    }

    if (!Types.ObjectId.isValid(chatId) || !Types.ObjectId.isValid(msgId)) {
      console.warn(
        `[SECURITY] Tentative de editMessage avec IDs invalides par user ${s.data.user.id}`,
      );
      return;
    }

    try {
      const msg = await this.chatService.updateMessage(
        chatId,
        msgId,
        s.data.user.id,
        content,
      );

      this.server.to(chatId).emit('messageUpdated', {
        chatId,
        msgId: msg.id,
        content: msg.content,
        editedAt: (msg as any).editedAt,
      });
    } catch (error) {
      console.error(
        `[ERROR] Erreur lors de l'édition du message par user ${s.data.user.id}:`,
        error.message,
      );
    }
  }

  @SubscribeMessage('deleteMessage')
  @Throttle({ del: { limit: 2, ttl: 30 } })
  async onDelete(
    @ConnectedSocket() s: Socket,
    @MessageBody() { chatId, msgId }: { chatId: string; msgId: string },
  ) {
    // Vérifier que l'utilisateur est bien authentifié
    if (!s.data?.user?.id) {
      console.warn(
        `[SECURITY] Tentative de deleteMessage sans authentification valide depuis ${s.handshake.address}`,
      );
      return s.disconnect();
    }

    if (!Types.ObjectId.isValid(chatId) || !Types.ObjectId.isValid(msgId)) {
      console.warn(
        `[SECURITY] Tentative de deleteMessage avec IDs invalides par user ${s.data.user.id}`,
      );
      return;
    }

    try {
      await this.chatService.deleteMessage(chatId, msgId, s.data.user.id);
      this.server.to(chatId).emit('messageDeleted', { chatId, msgId });
    } catch (error) {
      console.error(
        `[ERROR] Erreur lors de la suppression du message par user ${s.data.user.id}:`,
        error.message,
      );
    }
  }
}
