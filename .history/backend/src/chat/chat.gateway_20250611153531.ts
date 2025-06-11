import {
    WebSocketGateway, WebSocketServer, SubscribeMessage,
    OnGatewayConnection, MessageBody, ConnectedSocket,
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
  
    /* rejoindre */
    @SubscribeMessage('joinChat')
    async onJoin(@ConnectedSocket() s: Socket, @MessageBody() chatId: string) {
      if (await this.chatService.canAccessChat(s.data.user.id, chatId)) s.join(chatId);
    }
  
    /* création */
    @SubscribeMessage('sendMessage')
    async onMessage(
      @ConnectedSocket() s: Socket,
      @MessageBody() { chatId, content }: { chatId: string; content: string },
    ) {
      const msg = await this.chatService.createMessage(chatId, s.data.user.id, content);
      this.server.to(chatId).emit('newMessage', {
        chatId,
        msgId: msg.id,              // ← string déjà
        authorId: s.data.user.id,
        content: msg.content,
        sentAt: msg.sentAt,
      });
    }
  
    /* édition */
    @SubscribeMessage('editMessage')
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
  
    /* suppression */
    @SubscribeMessage('deleteMessage')
    async onDelete(
      @ConnectedSocket() s: Socket,
      @MessageBody() { chatId, msgId }: { chatId: string; msgId: string },
    ) {
      await this.chatService.deleteMessage(chatId, msgId, s.data.user.id);
      this.server.to(chatId).emit('messageDeleted', { chatId, msgId });
    }
  }
  