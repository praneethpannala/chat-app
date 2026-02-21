import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from '../app.controller';
import { AppService } from '../app.service';

describe('AppController', () => {
  let controller: AppController;
  let appService: AppService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: AppService,
          useValue: {
            getHello: jest.fn().mockReturnValue('Hello World!'),
          },
        },
      ],
    }).compile();

    controller = module.get<AppController>(AppController);
    appService = module.get<AppService>(AppService);
  });

  describe('getHello', () => {
    it('should return hello message', () => {
      const result = controller.getHello();
      expect(result).toBe('Hello World!');
    });

    it('should call appService.getHello', () => {
      controller.getHello();
      expect(appService.getHello).toHaveBeenCalled();
    });

    it('should call appService.getHello once per request', () => {
      controller.getHello();
      controller.getHello();
      expect(appService.getHello).toHaveBeenCalledTimes(2);
    });

    it('should return exact string from service', () => {
      (appService.getHello as jest.Mock).mockReturnValue('Test Response');
      const result = controller.getHello();
      expect(result).toBe('Test Response');
    });

    it('should handle service returning empty string', () => {
      (appService.getHello as jest.Mock).mockReturnValue('');
      const result = controller.getHello();
      expect(result).toBe('');
    });

    it('should handle service returning null', () => {
      (appService.getHello as jest.Mock).mockReturnValue(null);
      const result = controller.getHello();
      expect(result).toBeNull();
    });

    it('should handle service returning special characters', () => {
      (appService.getHello as jest.Mock).mockReturnValue('!@#$%^&*()');
      const result = controller.getHello();
      expect(result).toBe('!@#$%^&*()');
    });

    it('should propagate service errors', () => {
      (appService.getHello as jest.Mock).mockImplementation(() => {
        throw new Error('Service error');
      });
      expect(() => controller.getHello()).toThrow('Service error');
    });

    it('should be defined', () => {
      expect(controller.getHello).toBeDefined();
    });

    it('should return string type', () => {
      const result = controller.getHello();
      expect(typeof result).toBe('string');
    });

    it('should handle multiple sequential calls', () => {
      const result1 = controller.getHello();
      const result2 = controller.getHello();
      const result3 = controller.getHello();

      expect(result1).toBe('Hello World!');
      expect(result2).toBe('Hello World!');
      expect(result3).toBe('Hello World!');
    });

    it('should use injected service', () => {
      expect(appService).toBeDefined();
      controller.getHello();
      expect(appService.getHello).toHaveBeenCalled();
    });
  });

  describe('AppController initialization', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });

    it('should have getHello method', () => {
      expect(controller.getHello).toBeDefined();
      expect(typeof controller.getHello).toBe('function');
    });

    it('should have appService injected', () => {
      expect(appService).toBeDefined();
    });

    it('should be instance of AppController', () => {
      expect(controller).toBeInstanceOf(AppController);
    });
  });

  describe('integration scenarios', () => {
    it('should handle controller lifecycle', () => {
      const result = controller.getHello();
      expect(result).toBe('Hello World!');
      expect(appService.getHello).toHaveBeenCalled();
    });

    it('should maintain service dependency', () => {
      controller.getHello();
      controller.getHello();
      expect(appService.getHello).toHaveBeenCalledTimes(2);
    });

    it('should work with mock service', () => {
      (appService.getHello as jest.Mock).mockReturnValue('Mocked Response');
      const result = controller.getHello();
      expect(result).toBe('Mocked Response');
    });
  });
});
