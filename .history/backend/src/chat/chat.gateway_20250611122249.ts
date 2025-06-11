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
    async handleConnection(socket: Socket) {
      const token = socket.handshake.auth?.token;
      if (!token) return socket.disconnect();
  
      try {
        const payload = this.jwtService.verify(token); // secret connu via AuthModule
        socket.data.user = { id: payload.sub, role: payload.role };
      } catch (e) {
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
  
    /** Envoi de message : vérifie puis broadcast */
    @SubscribeMessage('sendMessage')
    async onMessage(
      @ConnectedSocket() socket: Socket,
      @MessageBody() { chatId, content }: { chatId: string; content: string },
    ) {
      const authorId = socket.data.user.id;
      const msg = await this.chatService.createMessage(chatId, authorId, content);
  
      this.server.to(chatId).emit('newMessage', {
        chatId,
        authorId,
        content: msg.content,
        sentAt: msg.sentAt,
      });
    }
  }
  