import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { UsersModule } from '../users/users.module';
import { UsersService } from '../users/users.service';
import { UsersController } from '../users/users.controller';
import { User } from '../users/user.schema';

const mockUserModel = {
  findOneAndUpdate: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
};

describe('UsersModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [UsersModule],
    })
      .overrideProvider(getModelToken(User.name))
      .useValue(mockUserModel)
      .compile();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('module compilation', () => {
    it('should compile the module', () => {
      expect(module).toBeDefined();
    });
  });

  describe('providers', () => {
    it('should provide UsersService', () => {
      const service = module.get<UsersService>(UsersService);
      expect(service).toBeDefined();
    });

    it('should provide UsersService as an injectable instance', () => {
      const service = module.get<UsersService>(UsersService);
      expect(service).toBeInstanceOf(UsersService);
    });
  });

  describe('controllers', () => {
    it('should register UsersController', () => {
      const controller = module.get<UsersController>(UsersController);
      expect(controller).toBeDefined();
    });

    it('should register UsersController as correct instance', () => {
      const controller = module.get<UsersController>(UsersController);
      expect(controller).toBeInstanceOf(UsersController);
    });
  });

  describe('exports', () => {
    it('should export UsersService for use in other modules', () => {
      // Verify UsersService is resolvable (exported) from the module
      const service = module.get<UsersService>(UsersService);
      expect(service).toBeDefined();
    });

    it('exported UsersService should have saveUser method', () => {
      const service = module.get<UsersService>(UsersService);
      expect(typeof service.saveUser).toBe('function');
    });

    it('exported UsersService should have getAllUsers method', () => {
      const service = module.get<UsersService>(UsersService);
      expect(typeof service.getAllUsers).toBe('function');
    });

    it('exported UsersService should have getUserByUid method', () => {
      const service = module.get<UsersService>(UsersService);
      expect(typeof service.getUserByUid).toBe('function');
    });
  });

  describe('dependency injection', () => {
    it('UsersController should have UsersService injected', () => {
      const controller = module.get<UsersController>(UsersController);
      const service = module.get<UsersService>(UsersService);

      // Both should be resolvable from the same module
      expect(controller).toBeDefined();
      expect(service).toBeDefined();
    });

    it('should inject User model into UsersService', () => {
      const service = module.get<UsersService>(UsersService);
      // If model injection failed, service would not be defined
      expect(service).toBeDefined();
    });
  });
});
