import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka, Producer, Consumer } from 'kafkajs';

@Injectable()
export class KafkaService implements OnModuleInit, OnModuleDestroy {
  private kafka: Kafka;
  private producer: Producer;
  private consumer: Consumer;

  constructor(private configService: ConfigService) {
    const kafkaBroker = this.configService.get<string>('KAFKA_BROKER') || 'localhost:9092';
    this.kafka = new Kafka({
      clientId: 'zync',
      brokers: [kafkaBroker],
    });

    this.producer = this.kafka.producer();
    this.consumer = this.kafka.consumer({ groupId: 'zync-group' });
  }

  async onModuleInit() {
    await this.producer.connect();
    await this.consumer.connect();
    await this.consumer.subscribe({
      topic: 'messages',
      fromBeginning: false,
    });

    console.log('Kafka connected');
  }

  async onModuleDestroy() {
    await this.producer.disconnect();
    await this.consumer.disconnect();
  }

  async sendMessage(message: any) {
    console.log('Sending message to Kafka:', message)
    await this.producer.send({
      topic: 'messages',
      messages: [{ value: JSON.stringify(message) }],
    })
  }

  async consumeMessages(callback: (message: any) => void) {
    await this.consumer.run({
      eachMessage: async ({ message }) => {
        if (message.value) {
          const value = JSON.parse(message.value.toString());
          callback(value);
        }
      },
    });
  }
}
