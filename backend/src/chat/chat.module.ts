import { Module } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { MessagesModule } from '../messages/messages.module';
import { RedisService } from '../redis.service';
import { KafkaService } from '../kafka.service';

@Module({
  imports: [MessagesModule],
  providers: [ChatGateway, RedisService, KafkaService],
})
export class ChatModule {}