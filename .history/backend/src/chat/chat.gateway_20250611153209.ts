// backend/src/chat/chat.gateway.ts
import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    OnGatewayConnection,
    MessageBody,
    ConnectedSocket,
  } from '@nestjs/websockets';
  import { Server, Socket } from 'socket.io';
  import { JwtService } from '@nestjs/jwt';
  import { ChatService } from './chat.service';
  
  @WebSocketGateway({ namespace: '/chat', cors: true })
  export class ChatGateway implements OnGatewayConnection {
    @WebSocketServer() server: Server;
  
    constructor(
      private readonly jwtService: JwtService,
      private readonly chatService: ChatService,
    ) {}
  
    /** Authentifie la socket à la connexion */
    async handleConnection(@ConnectedSocket() socket: Socket) {
      const token = socket.handshake.auth?.token;
      if (!token) return socket.disconnect();
      try {
        const payload = this.jwtService.verify(token);
        socket.data.user = { id: payload.sub, role: payload.role };
      } catch {
        return socket.disconnect();
      }
    }
  
    /** Rejoint une room si autorisé */
    @SubscribeMessage('joinChat')
    async onJoin(
      @ConnectedSocket() socket: Socket,
      @MessageBody() chatId: string,
    ) {
      const uid = socket.data.user.id;
      if (await this.chatService.canAccessChat(uid, chatId)) {
        socket.join(chatId);
      }
    }
  
    /** Création de message */
    @SubscribeMessage('sendMessage')
    async onMessage(
      @ConnectedSocket() socket: Socket,
      @MessageBody() { chatId, content }: { chatId: string; content: string },
    ) {
      const authorId = socket.data.user.id;
      const msg = await this.chatService.createMessage(chatId, authorId, content);
  
      /* transmet l’ID sous forme de chaîne */
      this.server.to(chatId).emit('newMessage', {
        chatId,
        msgId: msg._id.toString(),
        authorId,
        content: msg.content,
        sentAt: msg.sentAt,
      });
    }
  
    /** Édition de message */
    @SubscribeMessage('editMessage')
    async onEdit(
      @ConnectedSocket() socket: Socket,
      @MessageBody()
      { chatId, msgId, content }: { chatId: string; msgId: string; content: string },
    ) {
      const userId = socket.data.user.id;
      const msg = await this.chatService.updateMessage(chatId, msgId, userId, content);
  
      this.server.to(chatId).emit('messageUpdated', {
        chatId,
        msgId: msg._id.toString(),
        content: msg.content,
        editedAt: (msg as any).editedAt,
      });
    }
  
    /** Suppression de message */
    @SubscribeMessage('deleteMessage')
    async onDelete(
      @ConnectedSocket() socket: Socket,
      @MessageBody() { chatId, msgId }: { chatId: string; msgId: string },
    ) {
      const userId = socket.data.user.id;
      await this.chatService.deleteMessage(chatId, msgId, userId);
      this.server.to(chatId).emit('messageDeleted', { chatId, msgId });
    }
  }
  