import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { MessagesService } from '../messages/messages.service';
import { Message } from '../messages/message.schema';

describe('MessagesService', () => {
  let service: MessagesService;
  let mockMessageModel: any;

  beforeEach(async () => {
    mockMessageModel = jest.fn().mockImplementation((data) => ({
      save: jest.fn().mockResolvedValue({
        _id: 'msg123',
        ...data,
        createdAt: new Date(),
      }),
    }));

    // Add static methods for find, findByIdAndUpdate, deleteMany
    mockMessageModel.find = jest.fn().mockReturnValue({
      sort: jest.fn().mockResolvedValue([]),
    });

    mockMessageModel.findByIdAndUpdate = jest.fn();
    mockMessageModel.deleteMany = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessagesService,
        {
          provide: getModelToken(Message.name),
          useValue: mockMessageModel,
        },
      ],
    }).compile();

    service = module.get<MessagesService>(MessagesService);
  });

  describe('saveMessage', () => {
    it('should save a message to database', async () => {
      const messageData = {
        senderId: 'user123',
        receiverId: 'user456',
        text: 'Hello World',
      };

      const result = await service.saveMessage('user123', 'user456', 'Hello World');

      expect(mockMessageModel).toHaveBeenCalledWith(messageData);
      expect(result._id).toBe('msg123');
      expect(result.senderId).toBe('user123');
      expect(result.receiverId).toBe('user456');
      expect(result.text).toBe('Hello World');
    });

    it('should create message with correct data structure', async () => {
      const messageData = {
        senderId: 'user999',
        receiverId: 'user888',
        text: 'Test',
      };

      const result = await service.saveMessage('user999', 'user888', 'Test');

      expect(mockMessageModel).toHaveBeenCalledWith(messageData);
      expect(result.senderId).toBe('user999');
      expect(result.receiverId).toBe('user888');
      expect(result.text).toBe('Test');
    });

    it('should handle empty message text', async () => {
      const messageData = {
        senderId: 'user123',
        receiverId: 'user456',
        text: '',
      };

      const result = await service.saveMessage('user123', 'user456', '');

      expect(mockMessageModel).toHaveBeenCalledWith(messageData);
      expect(result.text).toBe('');
    });

    it('should handle long message text', async () => {
      const longText = 'a'.repeat(1000);
      const messageData = {
        senderId: 'user123',
        receiverId: 'user456',
        text: longText,
      };

      const result = await service.saveMessage('user123', 'user456', longText);

      expect(mockMessageModel).toHaveBeenCalledWith(messageData);
      expect(result.text.length).toBe(1000);
    });

    it('should save message with special characters', async () => {
      const specialText = '!@#$%^&*()_+-=[]{}|;:",.<>?/`~';
      const messageData = {
        senderId: 'user123',
        receiverId: 'user456',
        text: specialText,
      };

      await service.saveMessage('user123', 'user456', specialText);

      expect(mockMessageModel).toHaveBeenCalledWith(messageData);
    });

    it('should save message with emoji', async () => {
      const emojiText = '👋 Hello 🌍';
      const messageData = {
        senderId: 'user123',
        receiverId: 'user456',
        text: emojiText,
      };

      await service.saveMessage('user123', 'user456', emojiText);

      expect(mockMessageModel).toHaveBeenCalledWith(messageData);
    });

    it('should return saved message with database metadata', async () => {
      const result = await service.saveMessage('user123', 'user456', 'Test');

      expect(result._id).toBeDefined();
      expect(result.createdAt).toBeDefined();
      expect(result._id).toBe('msg123');
    });

    it('should create new instance for each save', async () => {
      await service.saveMessage('user123', 'user456', 'Msg 1');
      await service.saveMessage('user789', 'user999', 'Msg 2');

      expect(mockMessageModel).toHaveBeenCalledTimes(2);
      expect(mockMessageModel).toHaveBeenNthCalledWith(1, {
        senderId: 'user123',
        receiverId: 'user456',
        text: 'Msg 1',
      });
      expect(mockMessageModel).toHaveBeenNthCalledWith(2, {
        senderId: 'user789',
        receiverId: 'user999',
        text: 'Msg 2',
      });
    });

    it('should handle database save errors', async () => {
      const mockInstance = {
        save: jest.fn().mockRejectedValue(new Error('Save failed')),
      };
      mockMessageModel.mockImplementationOnce(() => mockInstance);

      await expect(
        service.saveMessage('user123', 'user456', 'Test'),
      ).rejects.toThrow('Save failed');
    });

    it('should pass correct parameters to message constructor', async () => {
      const senderId = 'sender-id-123';
      const receiverId = 'receiver-id-456';
      const text = 'Custom message text';

      await service.saveMessage(senderId, receiverId, text);

      expect(mockMessageModel).toHaveBeenCalledWith({
        senderId,
        receiverId,
        text,
      });
    });

    it('should handle same sender and receiver', async () => {
      const messageData = {
        senderId: 'user123',
        receiverId: 'user123',
        text: 'Self message',
      };

      await service.saveMessage('user123', 'user123', 'Self message');

      expect(mockMessageModel).toHaveBeenCalledWith(messageData);
    });
  });

  describe('getMessages', () => {
    it('should retrieve messages between two users', async () => {
      const messages = [
        { _id: 'msg1', senderId: 'user123', receiverId: 'user456', text: 'Hi' },
        { _id: 'msg2', senderId: 'user456', receiverId: 'user123', text: 'Hello' },
      ];

      const mockSortFn = jest.fn().mockResolvedValue(messages);
      mockMessageModel.find = jest.fn().mockReturnValue({
        sort: mockSortFn,
      });

      const result = await service.getMessages('user123', 'user456');

      expect(mockMessageModel.find).toHaveBeenCalledWith({
        $or: [
          { senderId: 'user123', receiverId: 'user456' },
          { senderId: 'user456', receiverId: 'user123' },
        ],
      });
      expect(mockSortFn).toHaveBeenCalledWith({ createdAt: 1 });
      expect(result).toEqual(messages);
    });

    it('should return messages sorted by creation date ascending', async () => {
      const messages = [
        { _id: 'msg1', createdAt: new Date('2024-01-01') },
        { _id: 'msg2', createdAt: new Date('2024-01-02') },
        { _id: 'msg3', createdAt: new Date('2024-01-03') },
      ];

      const mockSortFn = jest.fn().mockResolvedValue(messages);
      mockMessageModel.find = jest.fn().mockReturnValue({
        sort: mockSortFn,
      });

      const result = await service.getMessages('user123', 'user456');

      expect(mockSortFn).toHaveBeenCalledWith({ createdAt: 1 });
      expect(result).toEqual(messages);
      expect(result[0].createdAt < result[1].createdAt).toBe(true);
    });

    it('should handle empty message list', async () => {
      const mockSortFn = jest.fn().mockResolvedValue([]);
      mockMessageModel.find = jest.fn().mockReturnValue({
        sort: mockSortFn,
      });

      const result = await service.getMessages('user123', 'user999');

      expect(result).toEqual([]);
      expect(result.length).toBe(0);
    });

    it('should retrieve messages in both directions', async () => {
      const messages = [
        { _id: 'msg1', senderId: 'user123', receiverId: 'user456', text: 'Msg 1' },
        { _id: 'msg2', senderId: 'user456', receiverId: 'user123', text: 'Msg 2' },
      ];

      const mockSortFn = jest.fn().mockResolvedValue(messages);
      mockMessageModel.find = jest.fn().mockReturnValue({
        sort: mockSortFn,
      });

      const result = await service.getMessages('user123', 'user456');

      expect(mockMessageModel.find).toHaveBeenCalledWith({
        $or: [
          { senderId: 'user123', receiverId: 'user456' },
          { senderId: 'user456', receiverId: 'user123' },
        ],
      });
      expect(result.length).toBe(2);
    });

    it('should retrieve many messages', async () => {
      const messages = Array.from({ length: 100 }, (_, i) => ({
        _id: `msg${i}`,
        text: `Message ${i}`,
      }));

      const mockSortFn = jest.fn().mockResolvedValue(messages);
      mockMessageModel.find = jest.fn().mockReturnValue({
        sort: mockSortFn,
      });

      const result = await service.getMessages('user123', 'user456');

      expect(result.length).toBe(100);
    });

    it('should call find with correct $or query structure', async () => {
      const mockSortFn = jest.fn().mockResolvedValue([]);
      mockMessageModel.find = jest.fn().mockReturnValue({
        sort: mockSortFn,
      });

      await service.getMessages('user123', 'user456');

      const findCall = mockMessageModel.find.mock.calls[0][0];
      expect(findCall.$or).toBeDefined();
      expect(findCall.$or.length).toBe(2);
      expect(findCall.$or[0]).toEqual({ senderId: 'user123', receiverId: 'user456' });
      expect(findCall.$or[1]).toEqual({ senderId: 'user456', receiverId: 'user123' });
    });

    it('should handle database errors gracefully', async () => {
      mockMessageModel.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockRejectedValue(new Error('Database error')),
      });

      await expect(service.getMessages('user123', 'user456')).rejects.toThrow(
        'Database error',
      );
    });

    it('should handle messages with same sender and receiver', async () => {
      const messages = [{ _id: 'msg1', senderId: 'user123', receiverId: 'user123' }];
      const mockSortFn = jest.fn().mockResolvedValue(messages);
      mockMessageModel.find = jest.fn().mockReturnValue({
        sort: mockSortFn,
      });

      const result = await service.getMessages('user123', 'user123');

      expect(mockMessageModel.find).toHaveBeenCalledWith({
        $or: [
          { senderId: 'user123', receiverId: 'user123' },
          { senderId: 'user123', receiverId: 'user123' },
        ],
      });
      expect(result).toEqual(messages);
    });

    it('should return exact message objects from database', async () => {
      const messages = [
        { _id: 'msg1', senderId: 'user123', receiverId: 'user456', text: 'Test', status: 'sent' },
      ];
      const mockSortFn = jest.fn().mockResolvedValue(messages);
      mockMessageModel.find = jest.fn().mockReturnValue({
        sort: mockSortFn,
      });

      const result = await service.getMessages('user123', 'user456');

      expect(result[0].status).toBe('sent');
      expect(result[0].text).toBe('Test');
    });
  });

  describe('clearChat', () => {
    it('should delete messages between two users in one direction', async () => {
      const result = { deletedCount: 5 };
      mockMessageModel.deleteMany = jest.fn().mockResolvedValue(result);

      const response = await service.clearChat('user123', 'user456');

      expect(mockMessageModel.deleteMany).toHaveBeenCalledWith({
        senderId: 'user123',
        receiverId: 'user456',
      });
      expect(response).toEqual(result);
      expect(response.deletedCount).toBe(5);
    });

    it('should handle clearing non-existent messages', async () => {
      const result = { deletedCount: 0 };
      mockMessageModel.deleteMany = jest.fn().mockResolvedValue(result);

      const response = await service.clearChat('user999', 'user888');

      expect(mockMessageModel.deleteMany).toHaveBeenCalled();
      expect(response.deletedCount).toBe(0);
    });

    it('should delete only messages from specific sender to receiver', async () => {
      mockMessageModel.deleteMany = jest.fn().mockResolvedValue({
        deletedCount: 3,
      });

      await service.clearChat('user123', 'user456');

      const deleteCall = mockMessageModel.deleteMany.mock.calls[0][0];
      expect(deleteCall.senderId).toBe('user123');
      expect(deleteCall.receiverId).toBe('user456');
      expect(deleteCall).toEqual({
        senderId: 'user123',
        receiverId: 'user456',
      });
    });

    it('should return delete operation result with metadata', async () => {
      const result = { deletedCount: 10, ok: 1 };
      mockMessageModel.deleteMany = jest.fn().mockResolvedValue(result);

      const response = await service.clearChat('user123', 'user456');

      expect(response.deletedCount).toBe(10);
      expect(response.ok).toBe(1);
    });

    it('should handle multiple delete operations independently', async () => {
      mockMessageModel.deleteMany = jest
        .fn()
        .mockResolvedValueOnce({ deletedCount: 5 })
        .mockResolvedValueOnce({ deletedCount: 3 });

      const result1 = await service.clearChat('user123', 'user456');
      const result2 = await service.clearChat('user789', 'user999');

      expect(result1.deletedCount).toBe(5);
      expect(result2.deletedCount).toBe(3);
      expect(mockMessageModel.deleteMany).toHaveBeenCalledTimes(2);
    });

    it('should not delete messages from other user pairs', async () => {
      mockMessageModel.deleteMany = jest.fn().mockResolvedValue({
        deletedCount: 2,
      });

      await service.clearChat('user123', 'user456');

      const firstCall = mockMessageModel.deleteMany.mock.calls[0][0];
      expect(firstCall).toEqual({
        senderId: 'user123',
        receiverId: 'user456',
      });

      mockMessageModel.deleteMany.mockClear();
      mockMessageModel.deleteMany.mockResolvedValue({
        deletedCount: 1,
      });

      await service.clearChat('user789', 'user999');

      const secondCall = mockMessageModel.deleteMany.mock.calls[0][0];
      expect(secondCall).toEqual({
        senderId: 'user789',
        receiverId: 'user999',
      });
    });

    it('should handle database errors during deletion', async () => {
      mockMessageModel.deleteMany = jest
        .fn()
        .mockRejectedValue(new Error('Database error'));

      await expect(service.clearChat('user123', 'user456')).rejects.toThrow(
        'Database error',
      );
    });

    it('should handle large batch deletions', async () => {
      mockMessageModel.deleteMany = jest.fn().mockResolvedValue({
        deletedCount: 50000,
      });

      const result = await service.clearChat('user123', 'user456');

      expect(result.deletedCount).toBe(50000);
    });
  });

  describe('updateStatus', () => {
    it('should update message status by ID', async () => {
      const updatedMessage = {
        _id: 'msg123',
        status: 'read',
      };

      mockMessageModel.findByIdAndUpdate = jest
        .fn()
        .mockResolvedValue(updatedMessage);

      const result = await service.updateStatus('msg123', 'read');

      expect(mockMessageModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'msg123',
        { status: 'read' },
      );
      expect(result).toEqual(updatedMessage);
      expect(result.status).toBe('read');
    });

    it('should handle delivered status update', async () => {
      mockMessageModel.findByIdAndUpdate = jest
        .fn()
        .mockResolvedValue({ _id: 'msg123', status: 'delivered' });

      const result = await service.updateStatus('msg123', 'delivered');

      expect(mockMessageModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'msg123',
        { status: 'delivered' },
      );
      expect(result.status).toBe('delivered');
    });

    it('should handle sent status update', async () => {
      mockMessageModel.findByIdAndUpdate = jest
        .fn()
        .mockResolvedValue({ _id: 'msg123', status: 'sent' });

      const result = await service.updateStatus('msg123', 'sent');

      expect(mockMessageModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'msg123',
        { status: 'sent' },
      );
      expect(result.status).toBe('sent');
    });

    it('should handle non-existent message update', async () => {
      mockMessageModel.findByIdAndUpdate = jest.fn().mockResolvedValue(null);

      const result = await service.updateStatus('msg999', 'read');

      expect(result).toBeNull();
    });

    it('should update message with correct ID', async () => {
      mockMessageModel.findByIdAndUpdate = jest
        .fn()
        .mockResolvedValue({ _id: 'msg456', status: 'sent' });

      await service.updateStatus('msg456', 'sent');

      const updateCall = mockMessageModel.findByIdAndUpdate.mock.calls[0];
      expect(updateCall[0]).toBe('msg456');
      expect(updateCall[1]).toEqual({ status: 'sent' });
    });

    it('should handle multiple status updates on same message', async () => {
      mockMessageModel.findByIdAndUpdate = jest
        .fn()
        .mockResolvedValueOnce({ _id: 'msg1', status: 'sent' })
        .mockResolvedValueOnce({ _id: 'msg1', status: 'delivered' })
        .mockResolvedValueOnce({ _id: 'msg1', status: 'read' });

      const result1 = await service.updateStatus('msg1', 'sent');
      const result2 = await service.updateStatus('msg1', 'delivered');
      const result3 = await service.updateStatus('msg1', 'read');

      expect(result1.status).toBe('sent');
      expect(result2.status).toBe('delivered');
      expect(result3.status).toBe('read');
      expect(mockMessageModel.findByIdAndUpdate).toHaveBeenCalledTimes(3);
    });

    it('should return updated message object with all properties', async () => {
      const updatedMessage = {
        _id: 'msg123',
        senderId: 'user123',
        receiverId: 'user456',
        text: 'Hello',
        status: 'read',
        createdAt: new Date(),
      };

      mockMessageModel.findByIdAndUpdate = jest
        .fn()
        .mockResolvedValue(updatedMessage);

      const result = await service.updateStatus('msg123', 'read');

      expect(result._id).toBe('msg123');
      expect(result.senderId).toBe('user123');
      expect(result.text).toBe('Hello');
      expect(result.status).toBe('read');
    });

    it('should handle database errors during update', async () => {
      mockMessageModel.findByIdAndUpdate = jest
        .fn()
        .mockRejectedValue(new Error('Database error'));

      await expect(service.updateStatus('msg123', 'read')).rejects.toThrow(
        'Database error',
      );
    });

    it('should handle different message IDs independently', async () => {
      mockMessageModel.findByIdAndUpdate = jest
        .fn()
        .mockResolvedValueOnce({ _id: 'msg1', status: 'read' })
        .mockResolvedValueOnce({ _id: 'msg2', status: 'delivered' });

      const result1 = await service.updateStatus('msg1', 'read');
      const result2 = await service.updateStatus('msg2', 'delivered');

      expect(result1._id).toBe('msg1');
      expect(result2._id).toBe('msg2');
    });

    it('should pass status in update query', async () => {
      mockMessageModel.findByIdAndUpdate = jest
        .fn()
        .mockResolvedValue({ _id: 'msg123', status: 'custom_status' });

      await service.updateStatus('msg123', 'custom_status');

      expect(mockMessageModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'msg123',
        { status: 'custom_status' },
      );
    });
  });

  describe('saveMessage - branch coverage', () => {
    it('should create instance and call save immediately', async () => {
      const saveMock = jest.fn().mockResolvedValue({
        _id: 'msg123',
        senderId: 'user1',
        receiverId: 'user2',
        text: 'msg',
      });

      mockMessageModel.mockImplementationOnce(() => ({
        save: saveMock,
      }));

      const result = await service.saveMessage('user1', 'user2', 'msg');

      expect(saveMock).toHaveBeenCalled();
      expect(result._id).toBe('msg123');
    });

    it('should return result from save call', async () => {
      const savedResult = {
        _id: 'msg999',
        senderId: 'a',
        receiverId: 'b',
        text: 'test',
        createdAt: new Date(),
      };

      mockMessageModel.mockImplementationOnce(() => ({
        save: jest.fn().mockResolvedValue(savedResult),
      }));

      const result = await service.saveMessage('a', 'b', 'test');

      expect(result).toBe(savedResult);
      expect(result._id).toBe('msg999');
    });

    it('should propagate save errors', async () => {
      mockMessageModel.mockImplementationOnce(() => ({
        save: jest.fn().mockRejectedValue(new Error('Connection lost')),
      }));

      await expect(
        service.saveMessage('user1', 'user2', 'msg'),
      ).rejects.toThrow('Connection lost');
    });

    it('should pass all three parameters to constructor', async () => {
      await service.saveMessage('senderId1', 'receiverId1', 'textContent');

      expect(mockMessageModel).toHaveBeenCalledWith({
        senderId: 'senderId1',
        receiverId: 'receiverId1',
        text: 'textContent',
      });
    });
  });

  describe('getMessages - branch coverage', () => {
    it('should chain find and sort correctly', async () => {
      const mockSortFn = jest.fn().mockResolvedValue([]);
      const mockFindFn = jest.fn().mockReturnValue({
        sort: mockSortFn,
      });

      mockMessageModel.find = mockFindFn;

      await service.getMessages('user1', 'user2');

      expect(mockFindFn).toHaveBeenCalled();
      expect(mockSortFn).toHaveBeenCalled();
    });

    it('should return result from sort chain', async () => {
      const messages = [{ _id: '1', text: 'msg' }];
      const mockSortFn = jest.fn().mockResolvedValue(messages);

      mockMessageModel.find = jest.fn().mockReturnValue({
        sort: mockSortFn,
      });

      const result = await service.getMessages('user1', 'user2');

      expect(result).toBe(messages);
      expect(result[0].text).toBe('msg');
    });

    it('should use $or query with correct field order', async () => {
      mockMessageModel.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockResolvedValue([]),
      });

      await service.getMessages('sender123', 'receiver456');

      const queryArg = mockMessageModel.find.mock.calls[0][0];
      expect(queryArg.$or[0].senderId).toBe('sender123');
      expect(queryArg.$or[0].receiverId).toBe('receiver456');
      expect(queryArg.$or[1].senderId).toBe('receiver456');
      expect(queryArg.$or[1].receiverId).toBe('sender123');
    });

    it('should sort by createdAt ascending (1)', async () => {
      mockMessageModel.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockResolvedValue([]),
      });

      await service.getMessages('user1', 'user2');

      const sortArg = mockMessageModel.find().sort.mock.calls[0][0];
      expect(sortArg.createdAt).toBe(1);
    });

    it('should propagate find errors', async () => {
      mockMessageModel.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockRejectedValue(new Error('Query failed')),
      });

      await expect(service.getMessages('user1', 'user2')).rejects.toThrow(
        'Query failed',
      );
    });
  });

  describe('clearChat - branch coverage', () => {
    it('should call deleteMany with exact parameters', async () => {
      mockMessageModel.deleteMany = jest.fn().mockResolvedValue({
        deletedCount: 0,
      });

      await service.clearChat('user1', 'user2');

      expect(mockMessageModel.deleteMany).toHaveBeenCalledWith({
        senderId: 'user1',
        receiverId: 'user2',
      });
    });

    it('should return deleteMany result object', async () => {
      const deleteResult = { deletedCount: 5, ok: 1 };
      mockMessageModel.deleteMany = jest
        .fn()
        .mockResolvedValue(deleteResult);

      const result = await service.clearChat('user1', 'user2');

      expect(result).toBe(deleteResult);
      expect(result.ok).toBe(1);
    });

    it('should work with different user IDs', async () => {
      mockMessageModel.deleteMany = jest.fn().mockResolvedValue({
        deletedCount: 0,
      });

      await service.clearChat('alice', 'bob');

      const callArg = mockMessageModel.deleteMany.mock.calls[0][0];
      expect(callArg.senderId).toBe('alice');
      expect(callArg.receiverId).toBe('bob');
    });

    it('should propagate deleteMany errors', async () => {
      mockMessageModel.deleteMany = jest
        .fn()
        .mockRejectedValue(new Error('Delete failed'));

      await expect(service.clearChat('user1', 'user2')).rejects.toThrow(
        'Delete failed',
      );
    });
  });

  describe('updateStatus - branch coverage', () => {
    it('should call findByIdAndUpdate with message ID and status', async () => {
      mockMessageModel.findByIdAndUpdate = jest
        .fn()
        .mockResolvedValue({ _id: 'id1', status: 'read' });

      await service.updateStatus('msg123', 'read');

      expect(mockMessageModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'msg123',
        { status: 'read' },
      );
    });

    it('should return the updated message from findByIdAndUpdate', async () => {
      const updatedMsg = {
        _id: 'msg456',
        status: 'delivered',
        text: 'hello',
      };

      mockMessageModel.findByIdAndUpdate = jest
        .fn()
        .mockResolvedValue(updatedMsg);

      const result = await service.updateStatus('msg456', 'delivered');

      expect(result).toBe(updatedMsg);
      expect(result.text).toBe('hello');
    });

    it('should handle null return when message not found', async () => {
      mockMessageModel.findByIdAndUpdate = jest.fn().mockResolvedValue(null);

      const result = await service.updateStatus('nonexistent', 'read');

      expect(result).toBeNull();
    });

    it('should propagate findByIdAndUpdate errors', async () => {
      mockMessageModel.findByIdAndUpdate = jest
        .fn()
        .mockRejectedValue(new Error('Update failed'));

      await expect(service.updateStatus('msg1', 'read')).rejects.toThrow(
        'Update failed',
      );
    });

    it('should handle different message IDs', async () => {
      mockMessageModel.findByIdAndUpdate = jest
        .fn()
        .mockResolvedValue({ _id: 'abc', status: 'sent' });

      await service.updateStatus('abc', 'sent');

      expect(mockMessageModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'abc',
        { status: 'sent' },
      );
    });
  });

  describe('service initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should have all required methods', () => {
      expect(service.saveMessage).toBeDefined();
      expect(service.getMessages).toBeDefined();
      expect(service.clearChat).toBeDefined();
      expect(service.updateStatus).toBeDefined();
    });

    it('should have messageModel injected', () => {
      expect(service['messageModel']).toBeDefined();
    });

    it('should be instance of MessagesService', () => {
      expect(service).toBeInstanceOf(MessagesService);
    });

    it('should have messageModel as injectable dependency', () => {
      expect(service['messageModel']).toBe(mockMessageModel);
    });

    it('should initialize with correct module configuration', async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          MessagesService,
          {
            provide: getModelToken(Message.name),
            useValue: mockMessageModel,
          },
        ],
      }).compile();

      const serviceInstance = module.get<MessagesService>(MessagesService);

      expect(serviceInstance).toBeInstanceOf(MessagesService);
      expect(serviceInstance['messageModel']).toBeDefined();
    });
  });

  describe('method return types and chaining', () => {
    it('saveMessage should return Promise', async () => {
      const result = service.saveMessage('u1', 'u2', 'msg');

      expect(result).toBeInstanceOf(Promise);
      await result;
    });

    it('getMessages should return Promise', async () => {
      mockMessageModel.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockResolvedValue([]),
      });

      const result = service.getMessages('u1', 'u2');

      expect(result).toBeInstanceOf(Promise);
      await result;
    });

    it('clearChat should return Promise', async () => {
      mockMessageModel.deleteMany = jest.fn().mockResolvedValue({});

      const result = service.clearChat('u1', 'u2');

      expect(result).toBeInstanceOf(Promise);
      await result;
    });

    it('updateStatus should return Promise', async () => {
      mockMessageModel.findByIdAndUpdate = jest.fn().mockResolvedValue({});

      const result = service.updateStatus('id', 'status');

      expect(result).toBeInstanceOf(Promise);
      await result;
    });

    it('should handle async/await correctly', async () => {
      mockMessageModel.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockResolvedValue([{ text: 'msg' }]),
      });

      const messages = await service.getMessages('u1', 'u2');

      expect(Array.isArray(messages)).toBe(true);
      expect(messages[0].text).toBe('msg');
    });
  });

  describe('integration scenarios', () => {
    it('should handle save then retrieve flow', async () => {
      const savedMsg = { _id: 'msg1', text: 'hello' };
      mockMessageModel.mockImplementationOnce(() => ({
        save: jest.fn().mockResolvedValue(savedMsg),
      }));

      const saved = await service.saveMessage('u1', 'u2', 'hello');

      expect(saved._id).toBe('msg1');

      const mockSortFn = jest.fn().mockResolvedValue([savedMsg]);
      mockMessageModel.find = jest.fn().mockReturnValue({
        sort: mockSortFn,
      });

      const retrieved = await service.getMessages('u1', 'u2');

      expect(retrieved[0]._id).toBe('msg1');
    });

    it('should handle update then retrieve flow', async () => {
      const updatedMsg = { _id: 'msg1', status: 'read' };
      mockMessageModel.findByIdAndUpdate = jest
        .fn()
        .mockResolvedValue(updatedMsg);

      const updated = await service.updateStatus('msg1', 'read');

      expect(updated.status).toBe('read');

      const mockSortFn = jest.fn().mockResolvedValue([updatedMsg]);
      mockMessageModel.find = jest.fn().mockReturnValue({
        sort: mockSortFn,
      });

      const retrieved = await service.getMessages('u1', 'u2');

      expect(retrieved[0].status).toBe('read');
    });

    it('should handle clear then verify empty', async () => {
      mockMessageModel.deleteMany = jest.fn().mockResolvedValue({
        deletedCount: 5,
      });

      const cleared = await service.clearChat('u1', 'u2');

      expect(cleared.deletedCount).toBe(5);

      const mockSortFn = jest.fn().mockResolvedValue([]);
      mockMessageModel.find = jest.fn().mockReturnValue({
        sort: mockSortFn,
      });

      const messages = await service.getMessages('u1', 'u2');

      expect(messages.length).toBe(0);
    });
  });

  describe('branch coverage - conditional paths', () => {
    it('should handle null message documents', async () => {
      mockMessageModel.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockResolvedValue(null),
      });

      const result = await service.getMessages('user1', 'user2');
      expect(result).toBeNull();
    });

    it('should handle undefined results from operations', async () => {
      mockMessageModel.deleteMany = jest.fn().mockResolvedValue(undefined);

      const result = await service.clearChat('user1', 'user2');
      expect(result).toBeUndefined();
    });

    it('should handle false-like values correctly', async () => {
      mockMessageModel.findByIdAndUpdate = jest.fn().mockResolvedValue(false);

      const result = await service.updateStatus('msg123', 'read');
      expect(result).toBe(false);
    });

    it('should handle zero deletedCount', async () => {
      mockMessageModel.deleteMany = jest.fn().mockResolvedValue({ deletedCount: 0 });

      const result = await service.clearChat('user1', 'user2');
      expect(result.deletedCount).toBe(0);
      expect(result.deletedCount === 0).toBe(true);
    });

    it('should distinguish between null and defined values', async () => {
      mockMessageModel.findByIdAndUpdate = jest.fn().mockResolvedValue(null);

      const result = await service.updateStatus('nonexistent', 'read');
      expect(result).toBeNull();
      expect(result === null).toBe(true);
      expect(result === undefined).toBe(false);
    });

    it('should handle truthy vs falsy results from find', async () => {
      const messages = [{ _id: 'msg1' }];
      mockMessageModel.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockResolvedValue(messages),
      });

      const result = await service.getMessages('user1', 'user2');
      expect(result).toBeTruthy();
      expect(result.length).toBe(1);
    });

    it('should correctly evaluate empty array as falsy in boolean context', async () => {
      mockMessageModel.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockResolvedValue([]),
      });

      const result = await service.getMessages('user1', 'user2');
      expect(result).toEqual([]);
      expect(result.length === 0).toBe(true);
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle database timeout during save', async () => {
      const mockInstance = {
        save: jest.fn().mockRejectedValue(new Error('Operation timed out')),
      };
      mockMessageModel.mockImplementationOnce(() => mockInstance);

      await expect(service.saveMessage('user1', 'user2', 'test')).rejects.toThrow(
        'Operation timed out',
      );
    });

    it('should verify update receives correct message ID', async () => {
      mockMessageModel.findByIdAndUpdate = jest.fn().mockResolvedValue({
        _id: 'specific-id-123',
        status: 'updated',
      });

      const result = await service.updateStatus('specific-id-123', 'updated');

      expect(mockMessageModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'specific-id-123',
        expect.any(Object),
      );
      expect(result._id).toBe('specific-id-123');
    });

    it('should handle delete with exact user pair matching', async () => {
      mockMessageModel.deleteMany = jest.fn().mockResolvedValue({ deletedCount: 3 });

      await service.clearChat('sender-id', 'receiver-id');

      expect(mockMessageModel.deleteMany).toHaveBeenCalledWith({
        senderId: 'sender-id',
        receiverId: 'receiver-id',
      });
    });
  });
});

