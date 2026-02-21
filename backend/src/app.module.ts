import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { MessagesModule } from './messages/messages.module';
import { ChatModule } from './chat/chat.module';
import { RedisService } from './redis.service';
import { KafkaService } from './kafka.service';
import * as admin from 'firebase-admin';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
      }),
      inject: [ConfigService],
    }),
    MessagesModule,
    ChatModule,
  ],
  providers: [RedisService, KafkaService],
  exports: [RedisService, KafkaService],
})
export class AppModule {
  constructor(private configService: ConfigService) {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId: this.configService.get<string>('FIREBASE_PROJECT_ID'),
    });
  }
}
