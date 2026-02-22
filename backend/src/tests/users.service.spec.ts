import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UsersService } from '../users/users.service';
import { User, UserDocument } from '../users/user.schema';

const mockUserModel = {
  findOneAndUpdate: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
};

describe('UsersService', () => {
  let service: UsersService;
  let userModel: Model<UserDocument>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getModelToken(User.name),
          useValue: mockUserModel,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    userModel = module.get<Model<UserDocument>>(getModelToken(User.name));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should have saveUser method', () => {
      expect(typeof service.saveUser).toBe('function');
    });

    it('should have getAllUsers method', () => {
      expect(typeof service.getAllUsers).toBe('function');
    });

    it('should have getUserByUid method', () => {
      expect(typeof service.getUserByUid).toBe('function');
    });
  });

  describe('saveUser', () => {
    const uid = 'uid-123';
    const name = 'John Doe';
    const email = 'john@example.com';
    const photoURL = 'https://example.com/photo.jpg';

    const savedUser = { uid, name, email, photoURL, _id: 'mongo-id-1' };

    it('should call findOneAndUpdate with correct arguments', async () => {
      mockUserModel.findOneAndUpdate.mockResolvedValue(savedUser);

      await service.saveUser(uid, name, email, photoURL);

      expect(mockUserModel.findOneAndUpdate).toHaveBeenCalledWith(
        { uid },
        { uid, name, email, photoURL },
        { upsert: true, new: true },
      );
    });

    it('should return the saved user', async () => {
      mockUserModel.findOneAndUpdate.mockResolvedValue(savedUser);

      const result = await service.saveUser(uid, name, email, photoURL);

      expect(result).toEqual(savedUser);
    });

    it('should use upsert: true option', async () => {
      mockUserModel.findOneAndUpdate.mockResolvedValue(savedUser);

      await service.saveUser(uid, name, email, photoURL);

      const options = mockUserModel.findOneAndUpdate.mock.calls[0][2];
      expect(options.upsert).toBe(true);
    });

    it('should use new: true option to return updated document', async () => {
      mockUserModel.findOneAndUpdate.mockResolvedValue(savedUser);

      await service.saveUser(uid, name, email, photoURL);

      const options = mockUserModel.findOneAndUpdate.mock.calls[0][2];
      expect(options.new).toBe(true);
    });

    it('should filter by uid when upserting', async () => {
      mockUserModel.findOneAndUpdate.mockResolvedValue(savedUser);

      await service.saveUser(uid, name, email, photoURL);

      const filter = mockUserModel.findOneAndUpdate.mock.calls[0][0];
      expect(filter).toEqual({ uid });
    });

    it('should save all provided fields', async () => {
      mockUserModel.findOneAndUpdate.mockResolvedValue(savedUser);

      await service.saveUser(uid, name, email, photoURL);

      const update = mockUserModel.findOneAndUpdate.mock.calls[0][1];
      expect(update).toEqual({ uid, name, email, photoURL });
    });

    it('should handle empty photoURL', async () => {
      const userNoPhoto = { uid, name, email, photoURL: '' };
      mockUserModel.findOneAndUpdate.mockResolvedValue(userNoPhoto);

      const result = await service.saveUser(uid, name, email, '');

      expect(mockUserModel.findOneAndUpdate).toHaveBeenCalledWith(
        { uid },
        { uid, name, email, photoURL: '' },
        { upsert: true, new: true },
      );
      expect(result).toEqual(userNoPhoto);
    });

    it('should propagate errors from the model', async () => {
      mockUserModel.findOneAndUpdate.mockRejectedValue(new Error('DB error'));

      await expect(service.saveUser(uid, name, email, photoURL)).rejects.toThrow('DB error');
    });

    it('should call findOneAndUpdate exactly once', async () => {
      mockUserModel.findOneAndUpdate.mockResolvedValue(savedUser);

      await service.saveUser(uid, name, email, photoURL);

      expect(mockUserModel.findOneAndUpdate).toHaveBeenCalledTimes(1);
    });
  });

  describe('getAllUsers', () => {
    const currentUid = 'current-uid-123';
    const users = [
      { uid: 'uid-1', name: 'Alice', email: 'alice@example.com' },
      { uid: 'uid-2', name: 'Bob', email: 'bob@example.com' },
    ];

    it('should call find with $ne filter for currentUid', async () => {
      mockUserModel.find.mockResolvedValue(users);

      await service.getAllUsers(currentUid);

      expect(mockUserModel.find).toHaveBeenCalledWith({
        uid: { $ne: currentUid },
      });
    });

    it('should return all users except the current user', async () => {
      mockUserModel.find.mockResolvedValue(users);

      const result = await service.getAllUsers(currentUid);

      expect(result).toEqual(users);
    });

    it('should return empty array when no other users exist', async () => {
      mockUserModel.find.mockResolvedValue([]);

      const result = await service.getAllUsers(currentUid);

      expect(result).toEqual([]);
    });

    it('should call find exactly once', async () => {
      mockUserModel.find.mockResolvedValue(users);

      await service.getAllUsers(currentUid);

      expect(mockUserModel.find).toHaveBeenCalledTimes(1);
    });

    it('should propagate errors from the model', async () => {
      mockUserModel.find.mockRejectedValue(new Error('DB error'));

      await expect(service.getAllUsers(currentUid)).rejects.toThrow('DB error');
    });

    it('should exclude only the current user by uid', async () => {
      mockUserModel.find.mockResolvedValue(users);

      await service.getAllUsers(currentUid);

      const filter = mockUserModel.find.mock.calls[0][0];
      expect(filter.uid.$ne).toBe(currentUid);
    });
  });

  describe('getUserByUid', () => {
    const uid = 'uid-abc';
    const user = { uid, name: 'Alice', email: 'alice@example.com' };

    it('should call findOne with the given uid', async () => {
      mockUserModel.findOne.mockResolvedValue(user);

      await service.getUserByUid(uid);

      expect(mockUserModel.findOne).toHaveBeenCalledWith({ uid });
    });

    it('should return the found user', async () => {
      mockUserModel.findOne.mockResolvedValue(user);

      const result = await service.getUserByUid(uid);

      expect(result).toEqual(user);
    });

    it('should return null when user is not found', async () => {
      mockUserModel.findOne.mockResolvedValue(null);

      const result = await service.getUserByUid(uid);

      expect(result).toBeNull();
    });

    it('should call findOne exactly once', async () => {
      mockUserModel.findOne.mockResolvedValue(user);

      await service.getUserByUid(uid);

      expect(mockUserModel.findOne).toHaveBeenCalledTimes(1);
    });

    it('should propagate errors from the model', async () => {
      mockUserModel.findOne.mockRejectedValue(new Error('DB error'));

      await expect(service.getUserByUid(uid)).rejects.toThrow('DB error');
    });

    it('should filter by uid field', async () => {
      mockUserModel.findOne.mockResolvedValue(user);

      await service.getUserByUid(uid);

      const filter = mockUserModel.findOne.mock.calls[0][0];
      expect(filter).toEqual({ uid });
    });
  });
});
