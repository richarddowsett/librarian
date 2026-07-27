import { cognitoSignUpSchema, cognitoConfirmSchema, emailAuthSchema } from './auth';

describe('Auth Validation Schemas', () => {
  describe('cognitoSignUpSchema', () => {
    it('should validate valid sign-up inputs', () => {
      const valid = {
        name: 'Jane Doe',
        email: 'jane@example.com',
        password: 'Password123',
      };
      const result = cognitoSignUpSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should reject empty name', () => {
      const invalid = {
        name: '  ',
        email: 'jane@example.com',
        password: 'Password123',
      };
      const result = cognitoSignUpSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject invalid emails', () => {
      const invalid = {
        name: 'Jane Doe',
        email: 'invalid-email',
        password: 'Password123',
      };
      const result = cognitoSignUpSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject weak passwords lacking numbers or uppercase', () => {
      const weakPassword = {
        name: 'Jane Doe',
        email: 'jane@example.com',
        password: 'password',
      };
      const result = cognitoSignUpSchema.safeParse(weakPassword);
      expect(result.success).toBe(false);
    });
  });

  describe('cognitoConfirmSchema', () => {
    it('should validate 6-digit confirmation code', () => {
      const valid = {
        email: 'jane@example.com',
        code: '123456',
      };
      const result = cognitoConfirmSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should reject codes under 6 digits', () => {
      const invalid = {
        email: 'jane@example.com',
        code: '123',
      };
      const result = cognitoConfirmSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('emailAuthSchema', () => {
    it('should validate standard email addresses', () => {
      const result = emailAuthSchema.safeParse({ email: 'user@librarian.app' });
      expect(result.success).toBe(true);
    });
  });
});
