import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: Redis;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    this.client = new Redis({
      host: this.configService.get<string>('REDIS_HOST'),
      port: this.configService.get<number>('REDIS_PORT'),
    });

    this.client.on('connect', () => {
      console.log('Redis connected');
    });

    this.client.on('error', (err) => {
      console.error('Redis error:', err);
    });
  }

  onModuleDestroy() {
    this.client.quit();
  }

  async setOnline(userId: string) {
    await this.client.set(`online:${userId}`, '1');
  }

  async setOffline(userId: string) {
    await this.client.del(`online:${userId}`);
  }

  async isOnline(userId: string) {
    const result = await this.client.get(`online:${userId}`);
    return result === '1';
  }

  async getOnlineUsers() {
    const keys = await this.client.keys('online:*');
    return keys.map((key) => key.replace('online:', ''));
  }
}
