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
      private jwtService: JwtService,
      private chatService: ChatService,
    ) {}
  
    /** À la connexion, on authentifie et on stocke l'userId dans le socket */
    async handleConnection(@ConnectedSocket() socket: Socket) {
      const token = socket.handshake.auth.token;
      const payload = this.jwtService.verify(token);
      socket.data.user = { id: payload.sub };
    }
  
    /** Rejoint une room seulement si autorisé */
    @SubscribeMessage('joinChat')
    async onJoin(
      @ConnectedSocket() socket: Socket,
      @MessageBody() chatId: string,
    ) {
      const userId = socket.data.user.id;
      if (await this.chatService.canAccessChat(userId, chatId)) {
        socket.join(chatId);
      }
    }
  
    /** Envoi de message : vérification + broadcast */
    @SubscribeMessage('sendMessage')
    async onMessage(
      @ConnectedSocket() socket: Socket,
      @MessageBody() payload: { chatId: string; content: string },
    ) {
      const authorId = socket.data.user.id;
      const { chatId, content } = payload;
      const msg = await this.chatService.createMessage(
        chatId,
        authorId,
        content,
      );
      this.server.to(chatId).emit('newMessage', {
        chatId,
        authorId,
        content: msg.content,
        sentAt: msg.sentAt,
      });
    }
  }
  