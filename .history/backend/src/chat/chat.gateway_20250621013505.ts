import {
    WebSocketGateway, WebSocketServer, SubscribeMessage,
    OnGatewayConnection, MessageBody, ConnectedSocket,
  } from '@nestjs/websockets';
  import { Server, Socket } from 'socket.io';
  import { JwtService } from '@nestjs/jwt';
  import { ChatService } from './chat.service';
  import { Throttle } from '@nestjs/throttler';
  import { PrismaService } from '../prisma/prisma.service';
  
  @WebSocketGateway({
    namespace: '/chat',
    cors: {
      origin: process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173',
      credentials: true,
    },
  })
  export class ChatGateway implements OnGatewayConnection {
    @WebSocketServer() server: Server;
  
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
          select: { id: true, role: true },
        });
  
        if (!user) return socket.disconnect();
  
        socket.data.user = { id: user.id, role: user.role };
      } catch {
        return socket.disconnect();
      }
    }
  
    @SubscribeMessage('joinChat')
    async onJoin(@ConnectedSocket() s: Socket, @MessageBody() chatId: string) {
      // Limite : 50 salons (+ la room par défaut = 51)
      if (s.rooms.size >= 51) return;
  
      if (await this.chatService.canAccessChat(s.data.user.id, chatId)) {
        s.join(chatId);
      }
    }
  
    @SubscribeMessage('sendMessage')
    @Throttle({ limit: 5, ttl: 10 })
    async onMessage(
      @ConnectedSocket() s: Socket,
      @MessageBody() { chatId, content }: { chatId: string; content: string },
    ) {
      const msg = await this.chatService.createMessage(chatId, s.data.user.id, content);
      this.server.to(chatId).emit('newMessage', {
        chatId,
        msgId: msg.id,          
        authorId: s.data.user.id,
        content: msg.content,
        sentAt: msg.sentAt,
      });
    }
  
    @SubscribeMessage('editMessage')
    @Throttle({ limit: 5, ttl: 10 })
    async onEdit(
      @ConnectedSocket() s: Socket,
      @MessageBody() { chatId, msgId, content }: { chatId: string; msgId: string; content: string },
    ) {
      const msg = await this.chatService.updateMessage(chatId, msgId, s.data.user.id, content);
      this.server.to(chatId).emit('messageUpdated', {
        chatId,
        msgId: msg.id,
        content: msg.content,
        editedAt: (msg as any).editedAt,
      });
    }
  
    @SubscribeMessage('deleteMessage')
    @Throttle({ limit: 5, ttl: 10 })
    async onDelete(
      @ConnectedSocket() s: Socket,
      @MessageBody() { chatId, msgId }: { chatId: string; msgId: string },
    ) {
      await this.chatService.deleteMessage(chatId, msgId, s.data.user.id);
      this.server.to(chatId).emit('messageDeleted', { chatId, msgId });
    }
  }
  