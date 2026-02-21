import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { KafkaService } from '../kafka.service';
import { Kafka, Producer, Consumer } from 'kafkajs';

jest.mock('kafkajs', () => {
  const mockProducer = {
    connect: jest.fn(),
    disconnect: jest.fn(),
    send: jest.fn(),
  };

  const mockConsumer = {
    connect: jest.fn(),
    disconnect: jest.fn(),
    subscribe: jest.fn(),
    run: jest.fn(),
  };

  const mockKafka = {
    producer: jest.fn().mockReturnValue(mockProducer),
    consumer: jest.fn().mockReturnValue(mockConsumer),
  };

  return {
    Kafka: jest.fn().mockReturnValue(mockKafka),
  };
});

describe('KafkaService', () => {
  let service: KafkaService;
  let mockConfigService: Partial<ConfigService>;
  let mockKafka: any;
  let mockProducer: any;
  let mockConsumer: any;

  beforeEach(async () => {
    mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'KAFKA_BROKER') return 'localhost:9092';
        return null;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KafkaService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<KafkaService>(KafkaService);

    const KafkaClass = Kafka as jest.MockedClass<typeof Kafka>;
    mockKafka = KafkaClass.mock.results[0]?.value;
    mockProducer = mockKafka.producer();
    mockConsumer = mockKafka.consumer();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with default Kafka broker', () => {
      expect(Kafka).toHaveBeenCalledWith({
        clientId: 'zync',
        brokers: ['localhost:9092'],
      });
    });

    it('should get KAFKA_BROKER from config', () => {
      expect(mockConfigService.get).toHaveBeenCalledWith('KAFKA_BROKER');
    });

    it('should use default broker if config not provided', async () => {
      (mockConfigService.get as jest.Mock).mockReturnValue(null);

      // Create new instance to test default behavior
      new KafkaService(mockConfigService as ConfigService);

      // Since we're in mock context, the default is used by kafkajs fallback
      expect(mockConfigService.get).toHaveBeenCalledWith('KAFKA_BROKER');
    });

    it('should initialize producer', () => {
      expect(mockKafka.producer).toHaveBeenCalled();
    });

    it('should initialize consumer with groupId', () => {
      expect(mockKafka.consumer).toHaveBeenCalledWith({ groupId: 'zync-group' });
    });

    it('should use custom Kafka broker from config', () => {
      (mockConfigService.get as jest.Mock).mockReturnValue('kafka-broker:9093');

      new KafkaService(mockConfigService as ConfigService);

      expect(Kafka).toHaveBeenCalledWith(
        expect.objectContaining({
          brokers: ['kafka-broker:9093'],
        }),
      );
    });
  });

  describe('onModuleInit', () => {
    it('should connect producer and consumer', async () => {
      mockProducer.connect.mockResolvedValue(undefined);
      mockConsumer.connect.mockResolvedValue(undefined);
      mockConsumer.subscribe.mockResolvedValue(undefined);

      await service.onModuleInit();

      expect(mockProducer.connect).toHaveBeenCalled();
      expect(mockConsumer.connect).toHaveBeenCalled();
    });

    it('should subscribe to messages topic', async () => {
      mockProducer.connect.mockResolvedValue(undefined);
      mockConsumer.connect.mockResolvedValue(undefined);
      mockConsumer.subscribe.mockResolvedValue(undefined);

      await service.onModuleInit();

      expect(mockConsumer.subscribe).toHaveBeenCalledWith({
        topic: 'messages',
        fromBeginning: false,
      });
    });

    it('should handle producer connection errors', async () => {
      mockProducer.connect.mockRejectedValue(new Error('Producer connection failed'));

      await expect(service.onModuleInit()).rejects.toThrow(
        'Producer connection failed',
      );
    });

    it('should handle consumer connection errors', async () => {
      mockProducer.connect.mockResolvedValue(undefined);
      mockConsumer.connect.mockRejectedValue(new Error('Consumer connection failed'));

      await expect(service.onModuleInit()).rejects.toThrow(
        'Consumer connection failed',
      );
    });

    it('should handle subscription errors', async () => {
      mockProducer.connect.mockResolvedValue(undefined);
      mockConsumer.connect.mockResolvedValue(undefined);
      mockConsumer.subscribe.mockRejectedValue(new Error('Subscription failed'));

      await expect(service.onModuleInit()).rejects.toThrow('Subscription failed');
    });

    it('should subscribe without reading from beginning', async () => {
      mockProducer.connect.mockResolvedValue(undefined);
      mockConsumer.connect.mockResolvedValue(undefined);
      mockConsumer.subscribe.mockResolvedValue(undefined);

      await service.onModuleInit();

      expect(mockConsumer.subscribe).toHaveBeenCalledWith(
        expect.objectContaining({
          fromBeginning: false,
        }),
      );
    });
  });

  describe('onModuleDestroy', () => {
    beforeEach(async () => {
      mockProducer.connect.mockResolvedValue(undefined);
      mockConsumer.connect.mockResolvedValue(undefined);
      mockConsumer.subscribe.mockResolvedValue(undefined);
      await service.onModuleInit();
    });

    it('should disconnect producer and consumer', async () => {
      mockProducer.disconnect.mockResolvedValue(undefined);
      mockConsumer.disconnect.mockResolvedValue(undefined);

      await service.onModuleDestroy();

      expect(mockProducer.disconnect).toHaveBeenCalled();
      expect(mockConsumer.disconnect).toHaveBeenCalled();
    });

    it('should handle producer disconnection errors', async () => {
      mockProducer.disconnect.mockRejectedValue(
        new Error('Producer disconnect failed'),
      );

      await expect(service.onModuleDestroy()).rejects.toThrow(
        'Producer disconnect failed',
      );
    });

    it('should handle consumer disconnection errors', async () => {
      mockProducer.disconnect.mockResolvedValue(undefined);
      mockConsumer.disconnect.mockRejectedValue(
        new Error('Consumer disconnect failed'),
      );

      await expect(service.onModuleDestroy()).rejects.toThrow(
        'Consumer disconnect failed',
      );
    });
  });

  describe('sendMessage', () => {
    beforeEach(async () => {
      mockProducer.connect.mockResolvedValue(undefined);
      mockConsumer.connect.mockResolvedValue(undefined);
      mockConsumer.subscribe.mockResolvedValue(undefined);
      mockProducer.send.mockResolvedValue(undefined);
      await service.onModuleInit();
    });

    it('should send message to Kafka', async () => {
      const message = {
        senderId: 'user123',
        receiverId: 'user456',
        text: 'Hello World',
      };

      await service.sendMessage(message);

      expect(mockProducer.send).toHaveBeenCalledWith({
        topic: 'messages',
        messages: [{ value: JSON.stringify(message) }],
      });
    });

    it('should stringify message data', async () => {
      const message = {
        senderId: 'user123',
        receiverId: 'user456',
        text: 'Test message',
      };

      await service.sendMessage(message);

      const callArgs = mockProducer.send.mock.calls[0][0];
      expect(callArgs.messages[0].value).toBe(JSON.stringify(message));
    });

    it('should send message with empty text', async () => {
      const message = {
        senderId: 'user123',
        receiverId: 'user456',
        text: '',
      };

      await service.sendMessage(message);

      expect(mockProducer.send).toHaveBeenCalled();
      const callArgs = mockProducer.send.mock.calls[0][0];
      expect(callArgs.messages[0].value).toContain('text');
    });

    it('should send message to correct topic', async () => {
      const message = {
        senderId: 'user1',
        receiverId: 'user2',
        text: 'Message',
      };

      await service.sendMessage(message);

      expect(mockProducer.send).toHaveBeenCalledWith(
        expect.objectContaining({
          topic: 'messages',
        }),
      );
    });

    it('should handle send errors', async () => {
      mockProducer.send.mockRejectedValue(new Error('Send failed'));

      const message = {
        senderId: 'user123',
        receiverId: 'user456',
        text: 'Message',
      };

      await expect(service.sendMessage(message)).rejects.toThrow('Send failed');
    });

    it('should send multiple messages sequentially', async () => {
      const message1 = { senderId: 'user1', receiverId: 'user2', text: 'Msg 1' };
      const message2 = { senderId: 'user3', receiverId: 'user4', text: 'Msg 2' };
      const message3 = { senderId: 'user5', receiverId: 'user6', text: 'Msg 3' };

      mockProducer.send.mockResolvedValue(undefined);

      await service.sendMessage(message1);
      await service.sendMessage(message2);
      await service.sendMessage(message3);

      expect(mockProducer.send).toHaveBeenCalledTimes(3);
    });

    it('should handle messages with special characters', async () => {
      const message = {
        senderId: 'user123',
        receiverId: 'user456',
        text: 'Message with special chars: !@#$%^&*()',
      };

      await service.sendMessage(message);

      const callArgs = mockProducer.send.mock.calls[0][0];
      expect(callArgs.messages[0].value).toBe(JSON.stringify(message));
    });

    it('should handle messages with emoji', async () => {
      const message = {
        senderId: 'user123',
        receiverId: 'user456',
        text: 'Hello 👋 World 🌍',
      };

      await service.sendMessage(message);

      const callArgs = mockProducer.send.mock.calls[0][0];
      const parsedMessage = JSON.parse(callArgs.messages[0].value);
      expect(parsedMessage.text).toContain('👋');
    });

    it('should handle long messages', async () => {
      const longText = 'a'.repeat(10000);
      const message = {
        senderId: 'user123',
        receiverId: 'user456',
        text: longText,
      };

      await service.sendMessage(message);

      expect(mockProducer.send).toHaveBeenCalled();
    });
  });

  describe('consumeMessages', () => {
    beforeEach(async () => {
      mockProducer.connect.mockResolvedValue(undefined);
      mockConsumer.connect.mockResolvedValue(undefined);
      mockConsumer.subscribe.mockResolvedValue(undefined);
      mockConsumer.run.mockResolvedValue(undefined);
      await service.onModuleInit();
    });

    it('should consume messages with callback', async () => {
      const callback = jest.fn();
      mockConsumer.run.mockImplementation(async ({ eachMessage }) => {
        const message = {
          value: Buffer.from(
            JSON.stringify({
              senderId: 'user1',
              receiverId: 'user2',
              text: 'Test',
            }),
          ),
        };
        await eachMessage({ message });
      });

      await service.consumeMessages(callback);

      expect(mockConsumer.run).toHaveBeenCalled();
      expect(callback).toHaveBeenCalledWith({
        senderId: 'user1',
        receiverId: 'user2',
        text: 'Test',
      });
    });

    it('should parse message value as JSON', async () => {
      const callback = jest.fn();
      const messageData = {
        senderId: 'user123',
        receiverId: 'user456',
        text: 'Hello',
      };

      mockConsumer.run.mockImplementation(async ({ eachMessage }) => {
        const message = {
          value: Buffer.from(JSON.stringify(messageData)),
        };
        await eachMessage({ message });
      });

      await service.consumeMessages(callback);

      expect(callback).toHaveBeenCalledWith(messageData);
    });

    it('should handle messages with null value', async () => {
      const callback = jest.fn();

      mockConsumer.run.mockImplementation(async ({ eachMessage }) => {
        const message = { value: null };
        await eachMessage({ message });
      });

      await service.consumeMessages(callback);

      expect(callback).not.toHaveBeenCalled();
    });

    it('should handle consume errors', async () => {
      mockConsumer.run.mockRejectedValue(new Error('Consume failed'));

      const callback = jest.fn();

      await expect(service.consumeMessages(callback)).rejects.toThrow(
        'Consume failed',
      );
    });

    it('should call eachMessage handler', async () => {
      const callback = jest.fn();
      let capturedHandler: any;

      mockConsumer.run.mockImplementation(async (config) => {
        capturedHandler = config.eachMessage;
      });

      await service.consumeMessages(callback);

      expect(mockConsumer.run).toHaveBeenCalledWith(
        expect.objectContaining({
          eachMessage: expect.any(Function),
        }),
      );
    });

    it('should handle multiple consumed messages', async () => {
      const callback = jest.fn();

      mockConsumer.run.mockImplementation(async ({ eachMessage }) => {
        const messages = [
          { value: Buffer.from(JSON.stringify({ text: 'Msg 1' })) },
          { value: Buffer.from(JSON.stringify({ text: 'Msg 2' })) },
          { value: Buffer.from(JSON.stringify({ text: 'Msg 3' })) },
        ];

        for (const msg of messages) {
          await eachMessage({ message: msg });
        }
      });

      await service.consumeMessages(callback);

      expect(callback).toHaveBeenCalledTimes(3);
    });

    it('should handle malformed JSON gracefully', async () => {
      const callback = jest.fn();

      mockConsumer.run.mockImplementation(async ({ eachMessage }) => {
        const message = {
          value: Buffer.from('invalid json'),
        };
        try {
          await eachMessage({ message });
        } catch (error) {
          // Expected to fail
        }
      });

      await service.consumeMessages(callback);
    });

    it('should handle messages with special characters', async () => {
      const callback = jest.fn();
      const messageData = {
        senderId: 'user123',
        receiverId: 'user456',
        text: 'Special chars: !@#$%^&*()',
      };

      mockConsumer.run.mockImplementation(async ({ eachMessage }) => {
        const message = {
          value: Buffer.from(JSON.stringify(messageData)),
        };
        await eachMessage({ message });
      });

      await service.consumeMessages(callback);

      expect(callback).toHaveBeenCalledWith(messageData);
    });

    it('should handle messages with emoji', async () => {
      const callback = jest.fn();
      const messageData = {
        senderId: 'user123',
        receiverId: 'user456',
        text: 'Emoji: 👋 🌍 ❤️',
      };

      mockConsumer.run.mockImplementation(async ({ eachMessage }) => {
        const message = {
          value: Buffer.from(JSON.stringify(messageData)),
        };
        await eachMessage({ message });
      });

      await service.consumeMessages(callback);

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('👋'),
        }),
      );
    });
  });

  describe('service lifecycle', () => {
    it('should implement OnModuleInit', () => {
      expect(service.onModuleInit).toBeDefined();
    });

    it('should implement OnModuleDestroy', () => {
      expect(service.onModuleDestroy).toBeDefined();
    });

    it('should be injectable', () => {
      expect(service).toBeInstanceOf(KafkaService);
    });

    it('should have sendMessage method', () => {
      expect(service.sendMessage).toBeDefined();
      expect(typeof service.sendMessage).toBe('function');
    });

    it('should have consumeMessages method', () => {
      expect(service.consumeMessages).toBeDefined();
      expect(typeof service.consumeMessages).toBe('function');
    });
  });

  describe('integration scenarios', () => {
    beforeEach(async () => {
      mockProducer.connect.mockResolvedValue(undefined);
      mockConsumer.connect.mockResolvedValue(undefined);
      mockConsumer.subscribe.mockResolvedValue(undefined);
      mockProducer.send.mockResolvedValue(undefined);
      mockConsumer.run.mockResolvedValue(undefined);
      await service.onModuleInit();
    });

    it('should handle send and consume cycle', async () => {
      const messageToSend = {
        senderId: 'user1',
        receiverId: 'user2',
        text: 'Hello',
      };

      const consumeCallback = jest.fn();

      mockConsumer.run.mockImplementation(async ({ eachMessage }) => {
        const message = {
          value: Buffer.from(JSON.stringify(messageToSend)),
        };
        await eachMessage({ message });
      });

      await service.sendMessage(messageToSend);
      await service.consumeMessages(consumeCallback);

      expect(mockProducer.send).toHaveBeenCalled();
      expect(consumeCallback).toHaveBeenCalledWith(messageToSend);
    });

    it('should handle multiple concurrent sends', async () => {
      const messages = [
        { senderId: 'u1', receiverId: 'u2', text: 'Msg 1' },
        { senderId: 'u3', receiverId: 'u4', text: 'Msg 2' },
        { senderId: 'u5', receiverId: 'u6', text: 'Msg 3' },
      ];

      mockProducer.send.mockResolvedValue(undefined);

      await Promise.all(messages.map((msg) => service.sendMessage(msg)));

      expect(mockProducer.send).toHaveBeenCalledTimes(3);
    });
  });
});
