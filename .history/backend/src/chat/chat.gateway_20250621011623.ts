import {
    WebSocketGateway, WebSocketServer, SubscribeMessage,
    OnGatewayConnection, MessageBody, ConnectedSocket,
  } from '@nestjs/websockets';
  import { Server, Socket } from 'socket.io';
  import { JwtService } from '@nestjs/jwt';
  import { ChatService } from './chat.service';
  import { Throttle } from '@nestjs/throttler';
  
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
    ) {}
  
    async handleConnection(@ConnectedSocket() socket: Socket) {
      const token = socket.handshake.auth?.token;
      if (!token) return socket.disconnect();
      try {
        const p = this.jwtService.verify(token);
        socket.data.user = { id: p.sub, role: p.role };
      } catch {
        return socket.disconnect();
      }
    }
  
    @SubscribeMessage('joinChat')
    async onJoin(@ConnectedSocket() s: Socket, @MessageBody() chatId: string) {
      if (await this.chatService.canAccessChat(s.data.user.id, chatId)) s.join(chatId);
    }
  
    @SubscribeMessage('sendMessage')
    @Throttle({ send: { limit: 5, ttl: 10 } })
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
    @Throttle({ edit: { limit: 5, ttl: 10 } })
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
    @Throttle({ del: { limit: 5, ttl: 10 } })
    async onDelete(
      @ConnectedSocket() s: Socket,
      @MessageBody() { chatId, msgId }: { chatId: string; msgId: string },
    ) {
      await this.chatService.deleteMessage(chatId, msgId, s.data.user.id);
      this.server.to(chatId).emit('messageDeleted', { chatId, msgId });
    }
  }
  