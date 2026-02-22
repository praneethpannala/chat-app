import { SchemaFactory } from '@nestjs/mongoose';
import { Schema } from 'mongoose';
import { User, UserDocument, UserSchema } from '../users/user.schema';

describe('User Schema', () => {
  let schema: Schema;

  beforeEach(() => {
    schema = SchemaFactory.createForClass(User);
  });

  describe('UserSchema', () => {
    it('should be defined', () => {
      expect(UserSchema).toBeDefined();
    });

    it('should be an instance of mongoose Schema', () => {
      expect(UserSchema).toBeInstanceOf(Schema);
    });

    it('should have timestamps option enabled', () => {
      expect((UserSchema as any).options.timestamps).toBe(true);
    });
  });

  describe('User class', () => {
    it('should be defined', () => {
      expect(User).toBeDefined();
    });

    it('should create an instance with all fields', () => {
      const user = new User();
      user.uid = 'uid-123';
      user.name = 'John Doe';
      user.email = 'john@example.com';
      user.photoURL = 'https://example.com/photo.jpg';

      expect(user.uid).toBe('uid-123');
      expect(user.name).toBe('John Doe');
      expect(user.email).toBe('john@example.com');
      expect(user.photoURL).toBe('https://example.com/photo.jpg');
    });

    it('should allow photoURL to be undefined (optional)', () => {
      const user = new User();
      user.uid = 'uid-456';
      user.name = 'Jane Doe';
      user.email = 'jane@example.com';

      expect(user.photoURL).toBeUndefined();
    });
  });

  describe('Schema paths', () => {
    it('should have uid path', () => {
      expect(schema.path('uid')).toBeDefined();
    });

    it('should have name path', () => {
      expect(schema.path('name')).toBeDefined();
    });

    it('should have email path', () => {
      expect(schema.path('email')).toBeDefined();
    });

    it('should have photoURL path', () => {
      expect(schema.path('photoURL')).toBeDefined();
    });

    it('should have createdAt path (from timestamps)', () => {
      expect(schema.path('createdAt')).toBeDefined();
    });

    it('should have updatedAt path (from timestamps)', () => {
      expect(schema.path('updatedAt')).toBeDefined();
    });
  });

  describe('Schema field validations', () => {
    it('should require uid', () => {
      const uidPath = schema.path('uid') as any;
      expect(uidPath.isRequired).toBe(true);
    });

    it('should require name', () => {
      const namePath = schema.path('name') as any;
      expect(namePath.isRequired).toBe(true);
    });

    it('should require email', () => {
      const emailPath = schema.path('email') as any;
      expect(emailPath.isRequired).toBe(true);
    });

    it('should not require photoURL', () => {
      const photoURLPath = schema.path('photoURL') as any;
      expect(photoURLPath.isRequired).toBeFalsy();
    });

    it('should have uid as unique', () => {
      const uidPath = schema.path('uid') as any;
      expect(uidPath.options.unique).toBe(true);
    });

    it('should define uid as String type', () => {
      const uidPath = schema.path('uid');
      expect(uidPath.instance).toBe('String');
    });

    it('should define name as String type', () => {
      const namePath = schema.path('name');
      expect(namePath.instance).toBe('String');
    });

    it('should define email as String type', () => {
      const emailPath = schema.path('email');
      expect(emailPath.instance).toBe('String');
    });

    it('should define photoURL as String type', () => {
      const photoURLPath = schema.path('photoURL');
      expect(photoURLPath.instance).toBe('String');
    });
  });

  describe('UserDocument type', () => {
    it('should export UserDocument type', () => {
      // UserDocument is a type alias: User & Document
      // Verified at compile time; runtime check ensures User is constructable
      const user = new User();
      expect(user).toBeInstanceOf(User);
    });
  });
});
