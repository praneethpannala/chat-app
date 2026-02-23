import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { MessagesService } from '../messages/messages.service';
import { RedisService } from '../redis.service';
import { KafkaService } from '../kafka.service';

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: false,
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private messagesService: MessagesService,
    private redisService: RedisService,
    private kafkaService: KafkaService,
  ) {
    console.log('ChatGateway initialized!')
  }

  async handleConnection(client: Socket) {
    const userId = client.handshake.query.userId as string;
    if (userId) {
      await this.redisService.setOnline(userId);
      const onlineUsers = await this.redisService.getOnlineUsers();
      this.server.emit('onlineUsers', onlineUsers);
      console.log(`User connected: ${userId}`);
    }
  }

  async handleDisconnect(client: Socket) {
    const userId = client.handshake.query.userId as string;
    if (userId) {
      await this.redisService.setOffline(userId);
      const onlineUsers = await this.redisService.getOnlineUsers();
      this.server.emit('onlineUsers', onlineUsers);
      console.log(`User disconnected: ${userId}`);
    }
  }

  @SubscribeMessage('sendMessage')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { senderId: string; receiverId: string; text: string },
  ) {
    console.log('Message received:', data)
    await this.kafkaService.sendMessage(data);

    const message = await this.messagesService.saveMessage(
      data.senderId,
      data.receiverId,
      data.text,
    );

    this.server.emit('receiveMessage', message);

    return message;
  }

  @SubscribeMessage('getMessages')
  async handleGetMessages(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { senderId: string; receiverId: string },
  ) {
    const messages = await this.messagesService.getMessages(
      data.senderId,
      data.receiverId,
    );

    client.emit('messages', messages);
  }

  @SubscribeMessage('clearChat')
  async handleClearChat(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { senderId: string; receiverId: string },
  ) {
    await this.messagesService.clearChat(data.senderId, data.receiverId);
    client.emit('chatCleared');
  }
}