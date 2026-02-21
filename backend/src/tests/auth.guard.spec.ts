import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '../auth.guard';
import * as admin from 'firebase-admin';

jest.mock('firebase-admin', () => ({
  auth: jest.fn(),
}));

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let mockExecutionContext: Partial<ExecutionContext>;
  let mockRequest: any;
  let mockAdmin: any;

  beforeEach(() => {
    mockRequest = {
      headers: {},
      user: undefined,
    };

    mockExecutionContext = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(mockRequest),
      }),
    };

    mockAdmin = {
      verifyIdToken: jest.fn(),
    };

    (admin.auth as jest.Mock).mockReturnValue(mockAdmin);

    guard = new AuthGuard();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('canActivate', () => {
    it('should return true for valid token', async () => {
      const validToken = 'valid-token-123';
      const decodedToken = {
        uid: 'user123',
        email: 'user@example.com',
      };

      mockRequest.headers.authorization = `Bearer ${validToken}`;
      mockAdmin.verifyIdToken.mockResolvedValue(decodedToken);

      const result = await guard.canActivate(
        mockExecutionContext as ExecutionContext,
      );

      expect(result).toBe(true);
      expect(mockRequest.user).toEqual(decodedToken);
    });

    it('should throw UnauthorizedException for missing token', async () => {
      mockRequest.headers.authorization = undefined;

      await expect(
        guard.canActivate(mockExecutionContext as ExecutionContext),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for invalid token format', async () => {
      mockRequest.headers.authorization = 'InvalidFormat token';

      await expect(
        guard.canActivate(mockExecutionContext as ExecutionContext),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for token verification failure', async () => {
      mockRequest.headers.authorization = 'Bearer invalid-token';
      mockAdmin.verifyIdToken.mockRejectedValue(new Error('Invalid token'));

      await expect(
        guard.canActivate(mockExecutionContext as ExecutionContext),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should extract Bearer token correctly', async () => {
      const token = 'extracted-token';
      const decodedToken = { uid: 'user123' };

      mockRequest.headers.authorization = `Bearer ${token}`;
      mockAdmin.verifyIdToken.mockResolvedValue(decodedToken);

      await guard.canActivate(mockExecutionContext as ExecutionContext);

      expect(mockAdmin.verifyIdToken).toHaveBeenCalledWith(token);
    });

    it('should assign decoded token to request.user', async () => {
      const decodedToken = {
        uid: 'user456',
        email: 'test@example.com',
        iat: 1234567890,
      };

      mockRequest.headers.authorization = `Bearer some-token`;
      mockAdmin.verifyIdToken.mockResolvedValue(decodedToken);

      await guard.canActivate(mockExecutionContext as ExecutionContext);

      expect(mockRequest.user).toEqual(decodedToken);
    });

    it('should throw UnauthorizedException when no authorization header', async () => {
      mockRequest.headers = {};

      await expect(
        guard.canActivate(mockExecutionContext as ExecutionContext),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should handle authorization header with Bearer but no token', async () => {
      mockRequest.headers.authorization = 'Bearer ';

      await expect(
        guard.canActivate(mockExecutionContext as ExecutionContext),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should handle authorization header with only Bearer', async () => {
      mockRequest.headers.authorization = 'Bearer';

      await expect(
        guard.canActivate(mockExecutionContext as ExecutionContext),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should handle Firebase auth verification errors', async () => {
      mockRequest.headers.authorization = 'Bearer test-token';
      mockAdmin.verifyIdToken.mockRejectedValue(
        new Error('Firebase verification failed'),
      );

      await expect(
        guard.canActivate(mockExecutionContext as ExecutionContext),
      ).rejects.toThrow('Invalid token');
    });

    it('should call admin.auth() to verify token', async () => {
      mockRequest.headers.authorization = 'Bearer token123';
      mockAdmin.verifyIdToken.mockResolvedValue({ uid: 'user' });

      await guard.canActivate(mockExecutionContext as ExecutionContext);

      expect(admin.auth).toHaveBeenCalled();
    });

    it('should handle very long token strings', async () => {
      const longToken = 'a'.repeat(10000);
      mockRequest.headers.authorization = `Bearer ${longToken}`;
      mockAdmin.verifyIdToken.mockResolvedValue({ uid: 'user123' });

      const result = await guard.canActivate(
        mockExecutionContext as ExecutionContext,
      );

      expect(result).toBe(true);
      expect(mockAdmin.verifyIdToken).toHaveBeenCalledWith(longToken);
    });

    it('should handle tokens with special characters', async () => {
      const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
      const decodedToken = { uid: 'user123' };

      mockRequest.headers.authorization = `Bearer ${token}`;
      mockAdmin.verifyIdToken.mockResolvedValue(decodedToken);

      const result = await guard.canActivate(
        mockExecutionContext as ExecutionContext,
      );

      expect(result).toBe(true);
    });

    it('should handle null decoded token', async () => {
      mockRequest.headers.authorization = 'Bearer token';
      mockAdmin.verifyIdToken.mockResolvedValue(null);

      const result = await guard.canActivate(
        mockExecutionContext as ExecutionContext,
      );

      expect(result).toBe(true);
      expect(mockRequest.user).toBeNull();
    });

    it('should handle tokens with custom claims', async () => {
      const decodedToken = {
        uid: 'user123',
        email: 'user@example.com',
        custom_claim: 'admin',
        another_claim: 'role',
      };

      mockRequest.headers.authorization = 'Bearer token-with-claims';
      mockAdmin.verifyIdToken.mockResolvedValue(decodedToken);

      await guard.canActivate(mockExecutionContext as ExecutionContext);

      expect(mockRequest.user).toEqual(decodedToken);
      expect(mockRequest.user.custom_claim).toBe('admin');
    });

    it('should be case-sensitive for Bearer prefix', async () => {
      mockRequest.headers.authorization = 'bearer token';

      await expect(
        guard.canActivate(mockExecutionContext as ExecutionContext),
      ).rejects.toThrow();
    });

    it('should preserve other request properties', async () => {
      mockRequest.headers.authorization = 'Bearer token123';
      mockRequest.id = 'request-id-123';
      mockRequest.method = 'GET';

      const decodedToken = { uid: 'user' };
      mockAdmin.verifyIdToken.mockResolvedValue(decodedToken);

      await guard.canActivate(mockExecutionContext as ExecutionContext);

      expect(mockRequest.id).toBe('request-id-123');
      expect(mockRequest.method).toBe('GET');
    });

    it('should implement CanActivate interface', () => {
      expect(guard.canActivate).toBeDefined();
      expect(typeof guard.canActivate).toBe('function');
    });

    it('should handle async Firebase operations', async () => {
      mockRequest.headers.authorization = 'Bearer async-token';
      mockAdmin.verifyIdToken.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve({ uid: 'user123' }), 100);
          }),
      );

      const result = await guard.canActivate(
        mockExecutionContext as ExecutionContext,
      );

      expect(result).toBe(true);
    });

    it('should handle token expiration error from Firebase', async () => {
      mockRequest.headers.authorization = 'Bearer expired-token';

      const expiredTokenError = new Error('Token expired');
      (expiredTokenError as any).code = 'auth/id-token-expired';

      mockAdmin.verifyIdToken.mockRejectedValue(expiredTokenError);

      await expect(
        guard.canActivate(mockExecutionContext as ExecutionContext),
      ).rejects.toThrow('Invalid token');
    });

    it('should handle multiple sequential requests independently', async () => {
      const token1 = 'token-1';
      const token2 = 'token-2';
      const decodedToken1 = { uid: 'user1' };
      const decodedToken2 = { uid: 'user2' };

      // First request
      mockRequest.headers.authorization = `Bearer ${token1}`;
      mockAdmin.verifyIdToken.mockResolvedValueOnce(decodedToken1);

      const result1 = await guard.canActivate(
        mockExecutionContext as ExecutionContext,
      );
      expect(result1).toBe(true);
      expect(mockRequest.user).toEqual(decodedToken1);

      // Second request
      mockRequest.headers.authorization = `Bearer ${token2}`;
      mockAdmin.verifyIdToken.mockResolvedValueOnce(decodedToken2);

      const result2 = await guard.canActivate(
        mockExecutionContext as ExecutionContext,
      );
      expect(result2).toBe(true);
      expect(mockRequest.user).toEqual(decodedToken2);
    });
  });
});
