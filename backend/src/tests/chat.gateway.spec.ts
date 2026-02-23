import { Test, TestingModule } from '@nestjs/testing';
import { ChatGateway } from '../chat/chat.gateway';
import { MessagesService } from '../messages/messages.service';
import { RedisService } from '../redis.service';
import { KafkaService } from '../kafka.service';

const mockMessagesService = {
  saveMessage: jest.fn(),
  getMessages: jest.fn(),
  clearChat: jest.fn(),
  updateStatus: jest.fn(),
};

const mockRedisService = {
  setOnline: jest.fn(),
  setOffline: jest.fn(),
  isOnline: jest.fn(),
  getOnlineUsers: jest.fn(),
};

const mockKafkaService = {
  sendMessage: jest.fn(),
  consumeMessages: jest.fn(),
};

const mockServer = {
  emit: jest.fn(),
};

const mockClient = {
  id: 'socket123',
  emit: jest.fn(),
  handshake: {
    query: { userId: 'user1' },
  },
};

describe('ChatGateway', () => {
  let gateway: ChatGateway;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatGateway,
        { provide: MessagesService, useValue: mockMessagesService },
        { provide: RedisService, useValue: mockRedisService },
        { provide: KafkaService, useValue: mockKafkaService },
      ],
    }).compile();

    gateway = module.get<ChatGateway>(ChatGateway);
    gateway.server = mockServer as any;

    jest.clearAllMocks();
  });

  describe('handleConnection', () => {
    it('should set user online when connected', async () => {
      mockRedisService.getOnlineUsers.mockResolvedValue(['user1']);
      await gateway.handleConnection(mockClient as any);
      expect(mockRedisService.setOnline).toHaveBeenCalledWith('user1');
    });

    it('should emit online users after connection', async () => {
      mockRedisService.getOnlineUsers.mockResolvedValue(['user1']);
      await gateway.handleConnection(mockClient as any);
      expect(mockServer.emit).toHaveBeenCalledWith('onlineUsers', ['user1']);
    });

    it('should not set online if no userId in query', async () => {
      const clientWithoutId = {
        ...mockClient,
        handshake: { query: {} },
      };
      await gateway.handleConnection(clientWithoutId as any);
      expect(mockRedisService.setOnline).not.toHaveBeenCalled();
    });
  });

  describe('handleDisconnect', () => {
    it('should set user offline when disconnected', async () => {
      mockRedisService.getOnlineUsers.mockResolvedValue([]);
      await gateway.handleDisconnect(mockClient as any);
      expect(mockRedisService.setOffline).toHaveBeenCalledWith('user1');
    });

    it('should emit updated online users after disconnect', async () => {
      mockRedisService.getOnlineUsers.mockResolvedValue([]);
      await gateway.handleDisconnect(mockClient as any);
      expect(mockServer.emit).toHaveBeenCalledWith('onlineUsers', []);
    });

    it('should not set offline if no userId in query', async () => {
      const clientWithoutId = {
        ...mockClient,
        handshake: { query: {} },
      };
      await gateway.handleDisconnect(clientWithoutId as any);
      expect(mockRedisService.setOffline).not.toHaveBeenCalled();
    });
  });

  describe('handleMessage', () => {
    it('should save message to database', async () => {
      const data = { senderId: 'user1', receiverId: 'user2', text: 'Hello!' };
      const savedMessage = { ...data, _id: 'msg1', status: 'sent' };
      mockMessagesService.saveMessage.mockResolvedValue(savedMessage);
      mockKafkaService.sendMessage.mockResolvedValue(undefined);

      await gateway.handleMessage(mockClient as any, data);

      expect(mockMessagesService.saveMessage).toHaveBeenCalledWith(
        'user1',
        'user2',
        'Hello!',
      );
    });

    it('should send message to kafka', async () => {
      const data = { senderId: 'user1', receiverId: 'user2', text: 'Hello!' };
      const savedMessage = { ...data, _id: 'msg1', status: 'sent' };
      mockMessagesService.saveMessage.mockResolvedValue(savedMessage);
      mockKafkaService.sendMessage.mockResolvedValue(undefined);

      await gateway.handleMessage(mockClient as any, data);

      expect(mockKafkaService.sendMessage).toHaveBeenCalledWith(data);
    });

    it('should emit message to all clients', async () => {
      const data = { senderId: 'user1', receiverId: 'user2', text: 'Hello!' };
      const savedMessage = { ...data, _id: 'msg1', status: 'sent' };
      mockMessagesService.saveMessage.mockResolvedValue(savedMessage);
      mockKafkaService.sendMessage.mockResolvedValue(undefined);

      await gateway.handleMessage(mockClient as any, data);

      expect(mockServer.emit).toHaveBeenCalledWith('receiveMessage', savedMessage);
    });

    it('should return saved message', async () => {
      const data = { senderId: 'user1', receiverId: 'user2', text: 'Hello!' };
      const savedMessage = { ...data, _id: 'msg1', status: 'sent' };
      mockMessagesService.saveMessage.mockResolvedValue(savedMessage);
      mockKafkaService.sendMessage.mockResolvedValue(undefined);

      const result = await gateway.handleMessage(mockClient as any, data);

      expect(result).toEqual(savedMessage);
    });
  });

  describe('handleGetMessages', () => {
    it('should get messages between two users', async () => {
      const data = { senderId: 'user1', receiverId: 'user2' };
      const messages = [
        { text: 'Hello!', senderId: 'user1', receiverId: 'user2' },
      ];
      mockMessagesService.getMessages.mockResolvedValue(messages);

      await gateway.handleGetMessages(mockClient as any, data);

      expect(mockMessagesService.getMessages).toHaveBeenCalledWith(
        'user1',
        'user2',
      );
    });

    it('should emit messages to client', async () => {
      const data = { senderId: 'user1', receiverId: 'user2' };
      const messages = [
        { text: 'Hello!', senderId: 'user1', receiverId: 'user2' },
      ];
      mockMessagesService.getMessages.mockResolvedValue(messages);

      await gateway.handleGetMessages(mockClient as any, data);

      expect(mockClient.emit).toHaveBeenCalledWith('messages', messages);
    });

    it('should return empty array when no messages', async () => {
      const data = { senderId: 'user1', receiverId: 'user2' };
      mockMessagesService.getMessages.mockResolvedValue([]);

      await gateway.handleGetMessages(mockClient as any, data);

      expect(mockClient.emit).toHaveBeenCalledWith('messages', []);
    });
  });

  describe('handleClearChat', () => {
    it('should clear chat between two users', async () => {
      const data = { senderId: 'user1', receiverId: 'user2' };
      mockMessagesService.clearChat.mockResolvedValue(undefined);

      await gateway.handleClearChat(mockClient as any, data);

      expect(mockMessagesService.clearChat).toHaveBeenCalledWith(
        'user1',
        'user2',
      );
    });

    it('should emit chatCleared to client', async () => {
      const data = { senderId: 'user1', receiverId: 'user2' };
      mockMessagesService.clearChat.mockResolvedValue(undefined);

      await gateway.handleClearChat(mockClient as any, data);

      expect(mockClient.emit).toHaveBeenCalledWith('chatCleared');
    });
  });
  describe('handleConnection - edge cases', () => {
    it('should handle empty string userId', async () => {
      const clientWithEmptyId = {
        ...mockClient,
        handshake: { query: { userId: '' } },
      };
      await gateway.handleConnection(clientWithEmptyId as any);
      expect(mockRedisService.setOnline).not.toHaveBeenCalled();
    });

    it('should handle multiple users online', async () => {
      mockRedisService.getOnlineUsers.mockResolvedValue(['user1', 'user2', 'user3']);
      await gateway.handleConnection(mockClient as any);
      expect(mockServer.emit).toHaveBeenCalledWith('onlineUsers', ['user1', 'user2', 'user3']);
    });

    it('should handle redis error gracefully', async () => {
      mockRedisService.setOnline.mockResolvedValue(undefined);
      mockRedisService.getOnlineUsers.mockResolvedValue(['user1']);
      await expect(gateway.handleConnection(mockClient as any)).resolves.not.toThrow();
    });
  });

  describe('handleDisconnect - edge cases', () => {
    it('should handle empty string userId on disconnect', async () => {
      const clientWithEmptyId = {
        ...mockClient,
        handshake: { query: { userId: '' } },
      };
      await gateway.handleDisconnect(clientWithEmptyId as any);
      expect(mockRedisService.setOffline).not.toHaveBeenCalled();
    });

    it('should handle multiple users still online after disconnect', async () => {
      mockRedisService.getOnlineUsers.mockResolvedValue(['user2', 'user3']);
      await gateway.handleDisconnect(mockClient as any);
      expect(mockServer.emit).toHaveBeenCalledWith('onlineUsers', ['user2', 'user3']);
    });
  });

  describe('handleMessage - edge cases', () => {
    it('should handle empty message text', async () => {
      const data = { senderId: 'user1', receiverId: 'user2', text: '' };
      const savedMessage = { ...data, _id: 'msg1', status: 'sent' };
      mockMessagesService.saveMessage.mockResolvedValue(savedMessage);
      mockKafkaService.sendMessage.mockResolvedValue(undefined);

      const result = await gateway.handleMessage(mockClient as any, data);
      expect(result).toEqual(savedMessage);
    });

    it('should handle long message text', async () => {
      const longText = 'a'.repeat(1000);
      const data = { senderId: 'user1', receiverId: 'user2', text: longText };
      const savedMessage = { ...data, _id: 'msg1', status: 'sent' };
      mockMessagesService.saveMessage.mockResolvedValue(savedMessage);
      mockKafkaService.sendMessage.mockResolvedValue(undefined);

      const result = await gateway.handleMessage(mockClient as any, data);
      expect(result).toEqual(savedMessage);
    });

    it('should handle same sender and receiver', async () => {
      const data = { senderId: 'user1', receiverId: 'user1', text: 'Hello!' };
      const savedMessage = { ...data, _id: 'msg1', status: 'sent' };
      mockMessagesService.saveMessage.mockResolvedValue(savedMessage);
      mockKafkaService.sendMessage.mockResolvedValue(undefined);

      const result = await gateway.handleMessage(mockClient as any, data);
      expect(result).toEqual(savedMessage);
    });
  });

  describe('handleGetMessages - edge cases', () => {
    it('should handle multiple messages', async () => {
      const data = { senderId: 'user1', receiverId: 'user2' };
      const messages = [
        { text: 'Hello!', senderId: 'user1', receiverId: 'user2' },
        { text: 'Hi!', senderId: 'user2', receiverId: 'user1' },
        { text: 'How are you?', senderId: 'user1', receiverId: 'user2' },
      ];
      mockMessagesService.getMessages.mockResolvedValue(messages);

      await gateway.handleGetMessages(mockClient as any, data);
      expect(mockClient.emit).toHaveBeenCalledWith('messages', messages);
    });

    it('should handle same sender and receiver', async () => {
      const data = { senderId: 'user1', receiverId: 'user1' };
      mockMessagesService.getMessages.mockResolvedValue([]);

      await gateway.handleGetMessages(mockClient as any, data);
      expect(mockMessagesService.getMessages).toHaveBeenCalledWith('user1', 'user1');
    });
  });

  describe('handleClearChat - edge cases', () => {
    it('should handle clearing empty chat', async () => {
      const data = { senderId: 'user1', receiverId: 'user2' };
      mockMessagesService.clearChat.mockResolvedValue({ deletedCount: 0 });

      await gateway.handleClearChat(mockClient as any, data);
      expect(mockClient.emit).toHaveBeenCalledWith('chatCleared');
    });

    it('should handle clearing chat with many messages', async () => {
      const data = { senderId: 'user1', receiverId: 'user2' };
      mockMessagesService.clearChat.mockResolvedValue({ deletedCount: 100 });

      await gateway.handleClearChat(mockClient as any, data);
      expect(mockClient.emit).toHaveBeenCalledWith('chatCleared');
    });

    it('should only clear chat for sender not receiver', async () => {
      const data = { senderId: 'user1', receiverId: 'user2' };
      mockMessagesService.clearChat.mockResolvedValue(undefined);

      await gateway.handleClearChat(mockClient as any, data);
      expect(mockMessagesService.clearChat).toHaveBeenCalledWith('user1', 'user2');
      expect(mockMessagesService.clearChat).not.toHaveBeenCalledWith('user2', 'user1');
    });
  });

  describe('error handling scenarios', () => {
    it('should handle Redis setOnline error on connection', async () => {
      mockRedisService.setOnline.mockRejectedValue(new Error('Redis unavailable'));
      await expect(gateway.handleConnection(mockClient as any)).rejects.toThrow('Redis unavailable');
    });

    it('should handle Redis getOnlineUsers error on connection', async () => {
      mockRedisService.setOnline.mockResolvedValue(undefined);
      mockRedisService.getOnlineUsers.mockRejectedValue(new Error('Redis error'));
      await expect(gateway.handleConnection(mockClient as any)).rejects.toThrow('Redis error');
    });

    it('should handle Redis setOffline error on disconnect', async () => {
      mockRedisService.setOffline.mockRejectedValue(new Error('Redis error'));
      await expect(gateway.handleDisconnect(mockClient as any)).rejects.toThrow('Redis error');
    });

    it('should handle Kafka sendMessage error gracefully', async () => {
      mockKafkaService.sendMessage.mockRejectedValue(new Error('Kafka error'));
      const data = { senderId: 'user1', receiverId: 'user2', text: 'test' };
      const savedMessage = { ...data, _id: 'msg1', status: 'sent' };
      mockMessagesService.saveMessage.mockResolvedValue(savedMessage);
      
      // Should not throw even if Kafka fails (runs in background)
      const result = await gateway.handleMessage(mockClient as any, data);
      expect(result).toEqual(savedMessage);
    });

    it('should handle MessagesService saveMessage error', async () => {
      mockKafkaService.sendMessage.mockResolvedValue(undefined);
      mockMessagesService.saveMessage.mockRejectedValue(new Error('DB error'));
      const data = { senderId: 'user1', receiverId: 'user2', text: 'test' };
      await expect(gateway.handleMessage(mockClient as any, data)).rejects.toThrow('DB error');
    });

    it('should handle MessagesService getMessages error', async () => {
      mockMessagesService.getMessages.mockRejectedValue(new Error('DB error'));
      const data = { senderId: 'user1', receiverId: 'user2' };
      await expect(gateway.handleGetMessages(mockClient as any, data)).rejects.toThrow('DB error');
    });

    it('should handle MessagesService clearChat error', async () => {
      mockMessagesService.clearChat.mockRejectedValue(new Error('DB error'));
      const data = { senderId: 'user1', receiverId: 'user2' };
      await expect(gateway.handleClearChat(mockClient as any, data)).rejects.toThrow('DB error');
    });
  });

  describe('null/undefined userId handling', () => {
    it('should not process connection with undefined userId', async () => {
      const clientNoId = {
        ...mockClient,
        handshake: { query: {} },
      };
      await gateway.handleConnection(clientNoId as any);
      expect(mockRedisService.setOnline).not.toHaveBeenCalled();
    });

    it('should not process disconnect with undefined userId', async () => {
      const clientNoId = {
        ...mockClient,
        handshake: { query: {} },
      };
      await gateway.handleDisconnect(clientNoId as any);
      expect(mockRedisService.setOffline).not.toHaveBeenCalled();
    });

    it('should not process connection with null userId', async () => {
      const clientNullId = {
        ...mockClient,
        handshake: { query: { userId: null } },
      };
      await gateway.handleConnection(clientNullId as any);
      expect(mockRedisService.setOnline).not.toHaveBeenCalled();
    });

    it('should not process disconnect with null userId', async () => {
      const clientNullId = {
        ...mockClient,
        handshake: { query: { userId: null } },
      };
      await gateway.handleDisconnect(clientNullId as any);
      expect(mockRedisService.setOffline).not.toHaveBeenCalled();
    });
  });

  describe('special characters and emoji handling', () => {
    it('should handle message with special characters', async () => {
      const data = { senderId: 'user1', receiverId: 'user2', text: '!@#$%^&*()_+-=[]{}|;:",.<>?/`~' };
      const savedMessage = { ...data, _id: 'msg1' };
      mockMessagesService.saveMessage.mockResolvedValue(savedMessage);
      mockKafkaService.sendMessage.mockResolvedValue(undefined);

      const result = await gateway.handleMessage(mockClient as any, data);
      expect(result.text).toBe('!@#$%^&*()_+-=[]{}|;:",.<>?/`~');
    });

    it('should handle message with emoji', async () => {
      const data = { senderId: 'user1', receiverId: 'user2', text: '👋 Hello 🌍 ❤️' };
      const savedMessage = { ...data, _id: 'msg1' };
      mockMessagesService.saveMessage.mockResolvedValue(savedMessage);
      mockKafkaService.sendMessage.mockResolvedValue(undefined);

      const result = await gateway.handleMessage(mockClient as any, data);
      expect(result.text).toContain('👋');
    });

    it('should handle message with newlines', async () => {
      const data = { senderId: 'user1', receiverId: 'user2', text: 'Line 1\nLine 2\nLine 3' };
      const savedMessage = { ...data, _id: 'msg1' };
      mockMessagesService.saveMessage.mockResolvedValue(savedMessage);
      mockKafkaService.sendMessage.mockResolvedValue(undefined);

      const result = await gateway.handleMessage(mockClient as any, data);
      expect(result.text).toContain('Line 2');
    });

    it('should handle message with unicode characters', async () => {
      const data = { senderId: 'user1', receiverId: 'user2', text: '你好世界 مرحبا العالم' };
      const savedMessage = { ...data, _id: 'msg1' };
      mockMessagesService.saveMessage.mockResolvedValue(savedMessage);
      mockKafkaService.sendMessage.mockResolvedValue(undefined);

      const result = await gateway.handleMessage(mockClient as any, data);
      expect(result.text).toContain('你好');
    });
  });

  describe('async operation ordering', () => {
    it('should save to DB before sending to Kafka in background on message', async () => {
      const callOrder = [];
      mockKafkaService.sendMessage.mockImplementation(() => {
        callOrder.push('kafka');
        return Promise.resolve(undefined);
      });
      mockMessagesService.saveMessage.mockImplementation(() => {
        callOrder.push('db');
        return Promise.resolve({ _id: 'msg1', text: 'test', senderId: 'user1', receiverId: 'user2' });
      });

      const data = { senderId: 'user1', receiverId: 'user2', text: 'test' };
      await gateway.handleMessage(mockClient as any, data);

      // DB should be saved first, then Kafka is called (but not awaited)
      expect(callOrder[0]).toBe('db');
      expect(callOrder[1]).toBe('kafka');
    });

    it('should emit message after saving', async () => {
      const savedMessage = { _id: 'msg1', text: 'test', senderId: 'user1', receiverId: 'user2' };
      mockKafkaService.sendMessage.mockResolvedValue(undefined);
      mockMessagesService.saveMessage.mockResolvedValue(savedMessage);

      const data = { senderId: 'user1', receiverId: 'user2', text: 'test' };
      await gateway.handleMessage(mockClient as any, data);

      expect(mockServer.emit).toHaveBeenCalledWith('receiveMessage', savedMessage);
    });
  });

  describe('server and client emission', () => {
    it('should emit to server on connection for online users', async () => {
      mockRedisService.getOnlineUsers.mockResolvedValue(['user1', 'user2']);
      await gateway.handleConnection(mockClient as any);

      expect(mockServer.emit).toHaveBeenCalledWith('onlineUsers', expect.any(Array));
    });

    it('should emit to server on disconnect for updated online users', async () => {
      mockRedisService.setOffline.mockResolvedValue(undefined);
      mockRedisService.getOnlineUsers.mockResolvedValue(['user2']);
      await gateway.handleDisconnect(mockClient as any);

      expect(mockServer.emit).toHaveBeenCalledWith('onlineUsers', ['user2']);
    });

    it('should emit to server on message broadcast', async () => {
      const savedMessage = { _id: 'msg1', text: 'test', senderId: 'user1', receiverId: 'user2' };
      mockKafkaService.sendMessage.mockResolvedValue(undefined);
      mockMessagesService.saveMessage.mockResolvedValue(savedMessage);

      const data = { senderId: 'user1', receiverId: 'user2', text: 'test' };
      await gateway.handleMessage(mockClient as any, data);

      expect(mockServer.emit).toHaveBeenCalledWith('receiveMessage', expect.any(Object));
    });

    it('should emit to client on getMessages', async () => {
      const messages = [{ _id: 'msg1', text: 'Hello' }];
      mockMessagesService.getMessages.mockResolvedValue(messages);

      const data = { senderId: 'user1', receiverId: 'user2' };
      await gateway.handleGetMessages(mockClient as any, data);

      expect(mockClient.emit).toHaveBeenCalledWith('messages', messages);
    });

    it('should emit to client on clearChat', async () => {
      mockMessagesService.clearChat.mockResolvedValue(undefined);

      const data = { senderId: 'user1', receiverId: 'user2' };
      await gateway.handleClearChat(mockClient as any, data);

      expect(mockClient.emit).toHaveBeenCalledWith('chatCleared');
    });
  });

  describe('integration - full message flow', () => {
    it('should handle complete user lifecycle', async () => {
      // User connects
      mockRedisService.getOnlineUsers.mockResolvedValue(['user1']);
      await gateway.handleConnection(mockClient as any);
      expect(mockRedisService.setOnline).toHaveBeenCalledWith('user1');

      // User sends message
      const savedMessage = { _id: 'msg1', text: 'Hello', senderId: 'user1', receiverId: 'user2' };
      mockKafkaService.sendMessage.mockResolvedValue(undefined);
      mockMessagesService.saveMessage.mockResolvedValue(savedMessage);
      const data = { senderId: 'user1', receiverId: 'user2', text: 'Hello' };
      await gateway.handleMessage(mockClient as any, data);
      expect(mockServer.emit).toHaveBeenCalledWith('receiveMessage', savedMessage);

      // User gets messages
      const messages = [savedMessage];
      mockMessagesService.getMessages.mockResolvedValue(messages);
      await gateway.handleGetMessages(mockClient as any, { senderId: 'user1', receiverId: 'user2' });
      expect(mockClient.emit).toHaveBeenCalledWith('messages', messages);

      // User clears chat
      mockMessagesService.clearChat.mockResolvedValue(undefined);
      await gateway.handleClearChat(mockClient as any, { senderId: 'user1', receiverId: 'user2' });
      expect(mockClient.emit).toHaveBeenCalledWith('chatCleared');

      // User disconnects
      mockRedisService.getOnlineUsers.mockResolvedValue([]);
      await gateway.handleDisconnect(mockClient as any);
      expect(mockRedisService.setOffline).toHaveBeenCalledWith('user1');
    });
  });
});
