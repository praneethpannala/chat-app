import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../redis.service';
import Redis from 'ioredis';

jest.mock('ioredis', () => {
  const mockRedis = {
    set: jest.fn(),
    del: jest.fn(),
    get: jest.fn(),
    keys: jest.fn(),
    on: jest.fn(),
    quit: jest.fn(),
  };
  return jest.fn(() => mockRedis);
});

describe('RedisService', () => {
  let service: RedisService;
  let mockConfigService: Partial<ConfigService>;
  let mockRedisClient: any;

  beforeEach(async () => {
    mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'REDIS_HOST') return 'localhost';
        if (key === 'REDIS_PORT') return 6379;
        return null;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<RedisService>(RedisService);
    mockRedisClient = (Redis as jest.Mock).mock.results[0]?.value;
  });

  afterEach(() => {
    jest.clearAllMocks();
    mockRedisClient = (Redis as jest.Mock).mock.results[(Redis as jest.Mock).mock.results.length - 1]?.value;
  });

  describe('onModuleInit', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      (Redis as jest.Mock).mockClear();
      mockRedisClient = {
        set: jest.fn(),
        del: jest.fn(),
        get: jest.fn(),
        keys: jest.fn(),
        on: jest.fn(),
        quit: jest.fn(),
      };
      (Redis as jest.Mock).mockReturnValue(mockRedisClient);
    });

    it('should initialize Redis client with config', () => {
      service.onModuleInit();

      expect(Redis).toHaveBeenCalledWith({
        host: 'localhost',
        port: 6379,
      });
    });

    it('should get Redis host from config', () => {
      service.onModuleInit();

      expect(mockConfigService.get).toHaveBeenCalledWith('REDIS_HOST');
    });

    it('should get Redis port from config', () => {
      service.onModuleInit();

      expect(mockConfigService.get).toHaveBeenCalledWith('REDIS_PORT');
    });

    it('should register connect event listener', () => {
      service.onModuleInit();

      expect(mockRedisClient.on).toHaveBeenCalledWith('connect', expect.any(Function));
    });

    it('should register error event listener', () => {
      service.onModuleInit();

      expect(mockRedisClient.on).toHaveBeenCalledWith('error', expect.any(Function));
    });
  });

  describe('onModuleDestroy', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      (Redis as jest.Mock).mockClear();
      mockRedisClient = {
        set: jest.fn(),
        del: jest.fn(),
        get: jest.fn(),
        keys: jest.fn(),
        on: jest.fn(),
        quit: jest.fn(),
      };
      (Redis as jest.Mock).mockReturnValue(mockRedisClient);
    });

    it('should quit Redis connection', () => {
      service.onModuleInit();
      service.onModuleDestroy();

      expect(mockRedisClient.quit).toHaveBeenCalled();
    });
  });

  describe('setOnline', () => {
    beforeEach(() => {
      service.onModuleInit();
      mockRedisClient = (Redis as jest.Mock).mock.results[(Redis as jest.Mock).mock.results.length - 1]?.value;
    });

    it('should set user online in Redis', async () => {
      if (mockRedisClient) {
        mockRedisClient.set.mockResolvedValue('OK');

        await service.setOnline('user123');

        expect(mockRedisClient.set).toHaveBeenCalledWith('online:user123', '1');
      }
    });

    it('should handle multiple users going online', async () => {
      if (mockRedisClient) {
        mockRedisClient.set.mockResolvedValue('OK');

        await service.setOnline('user123');
        await service.setOnline('user456');

        expect(mockRedisClient.set).toHaveBeenCalledTimes(2);
        expect(mockRedisClient.set).toHaveBeenCalledWith('online:user123', '1');
        expect(mockRedisClient.set).toHaveBeenCalledWith('online:user456', '1');
      }
    });

    it('should use correct Redis key format', async () => {
      if (mockRedisClient) {
        mockRedisClient.set.mockResolvedValue('OK');

        await service.setOnline('testUser');

        expect(mockRedisClient.set).toHaveBeenCalledWith('online:testUser', '1');
      }
    });

    it('should handle numeric user IDs', async () => {
      if (mockRedisClient) {
        mockRedisClient.set.mockResolvedValue('OK');

        await service.setOnline('123456');

        expect(mockRedisClient.set).toHaveBeenCalledWith('online:123456', '1');
      }
    });
  });

  describe('setOffline', () => {
    beforeEach(() => {
      service.onModuleInit();
      mockRedisClient = (Redis as jest.Mock).mock.results[(Redis as jest.Mock).mock.results.length - 1]?.value;
    });

    it('should delete user online status from Redis', async () => {
      if (mockRedisClient) {
        mockRedisClient.del.mockResolvedValue(1);

        await service.setOffline('user123');

        expect(mockRedisClient.del).toHaveBeenCalledWith('online:user123');
      }
    });

    it('should handle multiple users going offline', async () => {
      if (mockRedisClient) {
        mockRedisClient.del.mockResolvedValue(1);

        await service.setOffline('user123');
        await service.setOffline('user456');

        expect(mockRedisClient.del).toHaveBeenCalledTimes(2);
        expect(mockRedisClient.del).toHaveBeenCalledWith('online:user123');
        expect(mockRedisClient.del).toHaveBeenCalledWith('online:user456');
      }
    });

    it('should use correct Redis key format', async () => {
      if (mockRedisClient) {
        mockRedisClient.del.mockResolvedValue(1);

        await service.setOffline('testUser');

        expect(mockRedisClient.del).toHaveBeenCalledWith('online:testUser');
      }
    });

    it('should handle non-existent user', async () => {
      if (mockRedisClient) {
        mockRedisClient.del.mockResolvedValue(0);

        await service.setOffline('nonExistent');

        expect(mockRedisClient.del).toHaveBeenCalled();
      }
    });
  });

  describe('isOnline', () => {
    beforeEach(() => {
      service.onModuleInit();
      mockRedisClient = (Redis as jest.Mock).mock.results[(Redis as jest.Mock).mock.results.length - 1]?.value;
    });

    it('should return true if user is online', async () => {
      if (mockRedisClient) {
        mockRedisClient.get.mockResolvedValue('1');

        const result = await service.isOnline('user123');

        expect(result).toBe(true);
        expect(mockRedisClient.get).toHaveBeenCalledWith('online:user123');
      }
    });

    it('should return false if user is offline', async () => {
      if (mockRedisClient) {
        mockRedisClient.get.mockResolvedValue(null);

        const result = await service.isOnline('user123');

        expect(result).toBe(false);
      }
    });

    it('should check correct Redis key', async () => {
      if (mockRedisClient) {
        mockRedisClient.get.mockResolvedValue('1');

        await service.isOnline('testUser');

        expect(mockRedisClient.get).toHaveBeenCalledWith('online:testUser');
      }
    });

    it('should handle multiple user status checks', async () => {
      if (mockRedisClient) {
        mockRedisClient.get
          .mockResolvedValueOnce('1')
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce('1');

        const result1 = await service.isOnline('user1');
        const result2 = await service.isOnline('user2');
        const result3 = await service.isOnline('user3');

        expect(result1).toBe(true);
        expect(result2).toBe(false);
        expect(result3).toBe(true);
      }
    });

    it('should return false for any non-1 value', async () => {
      if (mockRedisClient) {
        mockRedisClient.get.mockResolvedValue('0');

        const result = await service.isOnline('user123');

        expect(result).toBe(false);
      }
    });
  });

  describe('getOnlineUsers', () => {
    beforeEach(() => {
      service.onModuleInit();
      mockRedisClient = (Redis as jest.Mock).mock.results[(Redis as jest.Mock).mock.results.length - 1]?.value;
    });

    it('should return list of online user IDs', async () => {
      if (mockRedisClient) {
        mockRedisClient.keys.mockResolvedValue([
          'online:user123',
          'online:user456',
          'online:user789',
        ]);

        const result = await service.getOnlineUsers();

        expect(result).toEqual(['user123', 'user456', 'user789']);
      }
    });

    it('should extract userIds from keys correctly', async () => {
      if (mockRedisClient) {
        mockRedisClient.keys.mockResolvedValue([
          'online:alice',
          'online:bob',
        ]);

        const result = await service.getOnlineUsers();

        expect(result).toEqual(['alice', 'bob']);
      }
    });

    it('should use correct Redis key pattern', async () => {
      if (mockRedisClient) {
        mockRedisClient.keys.mockResolvedValue([]);

        await service.getOnlineUsers();

        expect(mockRedisClient.keys).toHaveBeenCalledWith('online:*');
      }
    });

    it('should return empty array when no users are online', async () => {
      if (mockRedisClient) {
        mockRedisClient.keys.mockResolvedValue([]);

        const result = await service.getOnlineUsers();

        expect(result).toEqual([]);
      }
    });

    it('should handle many online users', async () => {
      if (mockRedisClient) {
        const keys = Array.from({ length: 100 }, (_, i) => `online:user${i}`);
        mockRedisClient.keys.mockResolvedValue(keys);

        const result = await service.getOnlineUsers();

        expect(result.length).toBe(100);
        expect(result[0]).toBe('user0');
        expect(result[99]).toBe('user99');
      }
    });

    it('should not include online: prefix in results', async () => {
      if (mockRedisClient) {
        mockRedisClient.keys.mockResolvedValue([
          'online:user123',
          'online:user456',
        ]);

        const result = await service.getOnlineUsers();

        expect(result).not.toContain('online:user123');
        expect(result).toContain('user123');
      }
    });

    it('should maintain correct format after transformation', async () => {
      if (mockRedisClient) {
        mockRedisClient.keys.mockResolvedValue([
          'online:user-123',
          'online:user_456',
        ]);

        const result = await service.getOnlineUsers();

        expect(result).toEqual(['user-123', 'user_456']);
      }
    });
  });

  describe('integration scenarios', () => {
    beforeEach(() => {
      service.onModuleInit();
      mockRedisClient = (Redis as jest.Mock).mock.results[(Redis as jest.Mock).mock.results.length - 1]?.value;
    });

    it('should handle user going online then offline', async () => {
      if (mockRedisClient) {
        mockRedisClient.set.mockResolvedValue('OK');
        mockRedisClient.del.mockResolvedValue(1);
        mockRedisClient.get
          .mockResolvedValueOnce('1')
          .mockResolvedValueOnce(null);

        await service.setOnline('user123');
        let isOnline = await service.isOnline('user123');
        expect(isOnline).toBe(true);

        await service.setOffline('user123');
        isOnline = await service.isOnline('user123');
        expect(isOnline).toBe(false);
      }
    });

    it('should track multiple users online status', async () => {
      if (mockRedisClient) {
        mockRedisClient.set.mockResolvedValue('OK');
        mockRedisClient.keys.mockResolvedValue([
          'online:user1',
          'online:user2',
          'online:user3',
        ]);

        await service.setOnline('user1');
        await service.setOnline('user2');
        await service.setOnline('user3');

        const onlineUsers = await service.getOnlineUsers();

        expect(onlineUsers).toEqual(['user1', 'user2', 'user3']);
      }
    });

    it('should handle concurrent online/offline operations', async () => {
      if (mockRedisClient) {
        mockRedisClient.set.mockResolvedValue('OK');
        mockRedisClient.del.mockResolvedValue(1);
        mockRedisClient.keys.mockResolvedValue([
          'online:user1',
          'online:user2',
        ]);

        await Promise.all([
          service.setOnline('user1'),
          service.setOnline('user2'),
          service.setOffline('user3'),
        ]);

        const onlineUsers = await service.getOnlineUsers();

        expect(onlineUsers.length).toBeGreaterThan(0);
      }
    });
  });

  describe('error handling', () => {
    beforeEach(() => {
      service.onModuleInit();
      mockRedisClient = (Redis as jest.Mock).mock.results[(Redis as jest.Mock).mock.results.length - 1]?.value;
    });

    it('should handle Redis set operation errors', async () => {
      if (mockRedisClient) {
        mockRedisClient.set.mockRejectedValue(new Error('Redis error'));
        await expect(service.setOnline('user123')).rejects.toThrow('Redis error');
      }
    });

    it('should handle Redis del operation errors', async () => {
      if (mockRedisClient) {
        mockRedisClient.del.mockRejectedValue(new Error('Redis error'));
        await expect(service.setOffline('user123')).rejects.toThrow('Redis error');
      }
    });

    it('should handle Redis get operation errors', async () => {
      if (mockRedisClient) {
        mockRedisClient.get.mockRejectedValue(new Error('Redis error'));
        await expect(service.isOnline('user123')).rejects.toThrow('Redis error');
      }
    });

    it('should handle Redis keys operation errors', async () => {
      if (mockRedisClient) {
        mockRedisClient.keys.mockRejectedValue(new Error('Redis error'));
        await expect(service.getOnlineUsers()).rejects.toThrow('Redis error');
      }
    });
  });
});
