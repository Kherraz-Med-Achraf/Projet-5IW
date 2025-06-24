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

@UseGuards(WsThrottlerGuard)
@WebSocketGateway({
  namespace: '/chat',
  cors: {
    origin: process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173',
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  private readonly userRoomCount = new Map<string, number>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly chatService: ChatService,
    private readonly prisma: PrismaService,
  ) {}

  async handleConnection(@ConnectedSocket() socket: Socket) {
    const token = socket.handshake.auth?.token;
    if (!token) return socket.disconnect();

    try {
      const payload: any = this.jwtService.verify(token);

      // Vérification supplémentaire en base pour s'assurer que l'utilisateur existe encore
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, role: true, passwordChangedAt: true },
      });

      if (!user) return socket.disconnect();

      // Invalide le token si le mot de passe a été changé après son émission
      if (
        user.passwordChangedAt &&
        payload.iat * 1000 < new Date(user.passwordChangedAt).getTime()
      ) {
        return socket.disconnect();
      }

      socket.data.user = { id: user.id, role: user.role };

      // Initialiser le compteur s'il n'existe pas encore
      if (!this.userRoomCount.has(user.id)) {
        this.userRoomCount.set(user.id, 0);
      }

      // Room personnelle (pour recevoir newChat, etc.)
      socket.join(user.id);
    } catch {
      return socket.disconnect();
    }
  }

  handleDisconnect(@ConnectedSocket() socket: Socket) {
    const userId = socket?.data?.user?.id;
    if (!userId) return;

    // Décrémenter du nombre de rooms (hors room par défaut)
    const roomsLeft = Array.from(socket.rooms).filter(
      (r) => r !== socket.id,
    ).length;
    const current = this.userRoomCount.get(userId) ?? 0;
    this.userRoomCount.set(userId, Math.max(current - roomsLeft, 0));
  }

  @Throttle({ join: { limit: 20, ttl: 60 } })
  @SubscribeMessage('joinChat')
  async onJoin(@ConnectedSocket() s: Socket, @MessageBody() chatId: string) {
    // Validation ObjectId
    if (!Types.ObjectId.isValid(chatId)) return;
    const userId = s.data.user.id;

    // Compte global par utilisateur (toutes connexions)
    const current = this.userRoomCount.get(userId) ?? 0;
    if (current >= 500) return; // limite élevée pour les profils à forte activité

    if (await this.chatService.canAccessChat(userId, chatId)) {
      s.join(chatId);
      this.userRoomCount.set(userId, current + 1);
    }
  }

  @SubscribeMessage('sendMessage')
  @Throttle({ send: { limit: 5, ttl: 10 } })
  async onMessage(
    @ConnectedSocket() s: Socket,
    @MessageBody() { chatId, content }: { chatId: string; content: string },
  ) {
    if (!Types.ObjectId.isValid(chatId)) return;
    const msg = await this.chatService.createMessage(
      chatId,
      s.data.user.id,
      content,
    );
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
      // Récupère les utilisateurs déjà présents dans la room (donc qui recevront déjà newMessage)
      const socketsInRoom = await this.server.in(chatId).fetchSockets();
      const userIdsInRoom = new Set<string>(
        socketsInRoom
          .map((sock) => sock?.data?.user?.id as string | undefined)
          .filter(Boolean) as string[],
      );

      chat.participants.forEach((uid: string) => {
        // Pas de notification pour l'auteur ou pour ceux déjà dans la room
        if (uid === s.data.user.id || userIdsInRoom.has(uid)) return;

        this.server.to(uid).emit('chatUpdated', {
          chatId,
          lastMessage: msg.content,
          authorId: s.data.user.id,
          sentAt: msg.sentAt,
        });
      });
    }
  }

  @SubscribeMessage('editMessage')
  @Throttle({ edit: { limit: 5, ttl: 10 } })
  async onEdit(
    @ConnectedSocket() s: Socket,
    @MessageBody()
    {
      chatId,
      msgId,
      content,
    }: { chatId: string; msgId: string; content: string },
  ) {
    if (!Types.ObjectId.isValid(chatId) || !Types.ObjectId.isValid(msgId))
      return;
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
  }

  @SubscribeMessage('deleteMessage')
  @Throttle({ del: { limit: 5, ttl: 10 } })
  async onDelete(
    @ConnectedSocket() s: Socket,
    @MessageBody() { chatId, msgId }: { chatId: string; msgId: string },
  ) {
    if (!Types.ObjectId.isValid(chatId) || !Types.ObjectId.isValid(msgId))
      return;
    await this.chatService.deleteMessage(chatId, msgId, s.data.user.id);
    this.server.to(chatId).emit('messageDeleted', { chatId, msgId });
  }
}
