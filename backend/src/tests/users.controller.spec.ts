import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from '../users/users.controller';
import { UsersService } from '../users/users.service';

const mockUsersService = {
  saveUser: jest.fn(),
  getAllUsers: jest.fn(),
};

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    usersService = module.get<UsersService>(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });

    it('should be an instance of UsersController', () => {
      expect(controller).toBeInstanceOf(UsersController);
    });

    it('should have saveUser method', () => {
      expect(typeof controller.saveUser).toBe('function');
    });

    it('should have getAllUsers method', () => {
      expect(typeof controller.getAllUsers).toBe('function');
    });
  });

  describe('saveUser', () => {
    const body = {
      uid: 'uid-123',
      name: 'John Doe',
      email: 'john@example.com',
      photoURL: 'https://example.com/photo.jpg',
    };

    const savedUser = { ...body, _id: 'mongo-id-1' };

    it('should call usersService.saveUser with correct arguments', async () => {
      mockUsersService.saveUser.mockResolvedValue(savedUser);

      await controller.saveUser(body);

      expect(usersService.saveUser).toHaveBeenCalledWith(
        body.uid,
        body.name,
        body.email,
        body.photoURL,
      );
    });

    it('should return the result from usersService.saveUser', async () => {
      mockUsersService.saveUser.mockResolvedValue(savedUser);

      const result = await controller.saveUser(body);

      expect(result).toEqual(savedUser);
    });

    it('should call usersService.saveUser exactly once', async () => {
      mockUsersService.saveUser.mockResolvedValue(savedUser);

      await controller.saveUser(body);

      expect(usersService.saveUser).toHaveBeenCalledTimes(1);
    });

    it('should propagate errors from usersService.saveUser', async () => {
      mockUsersService.saveUser.mockRejectedValue(new Error('Save failed'));

      await expect(controller.saveUser(body)).rejects.toThrow('Save failed');
    });

    it('should handle body with empty photoURL', async () => {
      const bodyNoPhoto = { ...body, photoURL: '' };
      mockUsersService.saveUser.mockResolvedValue(bodyNoPhoto);

      await controller.saveUser(bodyNoPhoto);

      expect(usersService.saveUser).toHaveBeenCalledWith(
        bodyNoPhoto.uid,
        bodyNoPhoto.name,
        bodyNoPhoto.email,
        '',
      );
    });

    it('should pass uid as first argument to service', async () => {
      mockUsersService.saveUser.mockResolvedValue(savedUser);

      await controller.saveUser(body);

      expect(mockUsersService.saveUser.mock.calls[0][0]).toBe(body.uid);
    });

    it('should pass name as second argument to service', async () => {
      mockUsersService.saveUser.mockResolvedValue(savedUser);

      await controller.saveUser(body);

      expect(mockUsersService.saveUser.mock.calls[0][1]).toBe(body.name);
    });

    it('should pass email as third argument to service', async () => {
      mockUsersService.saveUser.mockResolvedValue(savedUser);

      await controller.saveUser(body);

      expect(mockUsersService.saveUser.mock.calls[0][2]).toBe(body.email);
    });

    it('should pass photoURL as fourth argument to service', async () => {
      mockUsersService.saveUser.mockResolvedValue(savedUser);

      await controller.saveUser(body);

      expect(mockUsersService.saveUser.mock.calls[0][3]).toBe(body.photoURL);
    });
  });

  describe('getAllUsers', () => {
    const req = { user: { uid: 'current-uid-123' } };
    const users = [
      { uid: 'uid-1', name: 'Alice', email: 'alice@example.com' },
      { uid: 'uid-2', name: 'Bob', email: 'bob@example.com' },
    ];

    it('should call usersService.getAllUsers with current user uid', async () => {
      mockUsersService.getAllUsers.mockResolvedValue(users);

      await controller.getAllUsers(req);

      expect(usersService.getAllUsers).toHaveBeenCalledWith(req.user.uid);
    });

    it('should return the list of users', async () => {
      mockUsersService.getAllUsers.mockResolvedValue(users);

      const result = await controller.getAllUsers(req);

      expect(result).toEqual(users);
    });

    it('should return empty array when no other users exist', async () => {
      mockUsersService.getAllUsers.mockResolvedValue([]);

      const result = await controller.getAllUsers(req);

      expect(result).toEqual([]);
    });

    it('should call usersService.getAllUsers exactly once', async () => {
      mockUsersService.getAllUsers.mockResolvedValue(users);

      await controller.getAllUsers(req);

      expect(usersService.getAllUsers).toHaveBeenCalledTimes(1);
    });

    it('should propagate errors from usersService.getAllUsers', async () => {
      mockUsersService.getAllUsers.mockRejectedValue(new Error('Fetch failed'));

      await expect(controller.getAllUsers(req)).rejects.toThrow('Fetch failed');
    });

    it('should extract uid from req.user', async () => {
      const customReq = { user: { uid: 'custom-uid-999' } };
      mockUsersService.getAllUsers.mockResolvedValue([]);

      await controller.getAllUsers(customReq);

      expect(usersService.getAllUsers).toHaveBeenCalledWith('custom-uid-999');
    });
  });
});
