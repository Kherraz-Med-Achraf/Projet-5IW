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
  
    /** Authentifie chaque nouvelle connexion socket */
    async handleConnection(@ConnectedSocket() socket: Socket) {
      const token = socket.handshake.auth?.token;
      if (!token) {
        return socket.disconnect();
      }
      try {
        /* la clé est déjà connue du JwtService via AuthModule */
        const payload = this.jwtService.verify(token);
        socket.data.user = { id: payload.sub, role: payload.role };
      } catch (err) {
        /* token invalide ou expiré → on coupe la connexion */
        return socket.disconnect();
      }
    }
  
    /** Rejoint la room si l’utilisateur y a droit */
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
  
    /** Envoie un message : vérifie l’accès puis diffuse */
    @SubscribeMessage('sendMessage')
    async onMessage(
      @ConnectedSocket() socket: Socket,
      @MessageBody() payload: { chatId: string; content: string },
    ) {
      const authorId = socket.data.user.id;
      const { chatId, content } = payload;
      const msg = await this.chatService.createMessage(chatId, authorId, content);
  
      this.server.to(chatId).emit('newMessage', {
        chatId,
        authorId,
        content: msg.content,
        sentAt: msg.sentAt,
      });
    }
  }
  