import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { LoginDto, ForgotPasswordDto, ResetPasswordDto } from './auth.dto';

describe('Auth DTOs', () => {
  describe('LoginDto', () => {
    it('should validate a valid login DTO', async () => {
      const loginData = {
        email: 'user@example.com',
        password: 'password123',
      };

      const loginDto = plainToClass(LoginDto, loginData);
      const errors = await validate(loginDto);

      expect(errors).toHaveLength(0);
    });

    it('should validate a valid login DTO with OTP', async () => {
      const loginData = {
        email: 'user@example.com',
        password: 'password123',
        otpCode: '123456',
      };

      const loginDto = plainToClass(LoginDto, loginData);
      const errors = await validate(loginDto);

      expect(errors).toHaveLength(0);
    });

    it('should fail validation when email is missing', async () => {
      const loginData = {
        password: 'password123',
      };

      const loginDto = plainToClass(LoginDto, loginData);
      const errors = await validate(loginDto);

      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('email');
      expect(errors[0].constraints).toHaveProperty('isEmail');
    });

    it('should fail validation when email is invalid', async () => {
      const loginData = {
        email: 'invalid-email',
        password: 'password123',
      };

      const loginDto = plainToClass(LoginDto, loginData);
      const errors = await validate(loginDto);

      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('email');
      expect(errors[0].constraints).toHaveProperty('isEmail');
    });

    it('should fail validation when password is missing', async () => {
      const loginData = {
        email: 'user@example.com',
      };

      const loginDto = plainToClass(LoginDto, loginData);
      const errors = await validate(loginDto);

      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('password');
      expect(errors[0].constraints).toHaveProperty('isNotEmpty');
    });

    it('should fail validation when password is empty', async () => {
      const loginData = {
        email: 'user@example.com',
        password: '',
      };

      const loginDto = plainToClass(LoginDto, loginData);
      const errors = await validate(loginDto);

      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('password');
      expect(errors[0].constraints).toHaveProperty('isNotEmpty');
    });

    it('should pass validation when otpCode is optional', async () => {
      const loginData = {
        email: 'user@example.com',
        password: 'password123',
        otpCode: undefined,
      };

      const loginDto = plainToClass(LoginDto, loginData);
      const errors = await validate(loginDto);

      expect(errors).toHaveLength(0);
    });
  });

  describe('ForgotPasswordDto', () => {
    it('should validate a valid forgot password DTO', async () => {
      const forgotPasswordData = {
        email: 'user@example.com',
      };

      const forgotPasswordDto = plainToClass(
        ForgotPasswordDto,
        forgotPasswordData,
      );
      const errors = await validate(forgotPasswordDto);

      expect(errors).toHaveLength(0);
    });

    it('should fail validation when email is missing', async () => {
      const forgotPasswordData = {};

      const forgotPasswordDto = plainToClass(
        ForgotPasswordDto,
        forgotPasswordData,
      );
      const errors = await validate(forgotPasswordDto);

      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('email');
      expect(errors[0].constraints).toHaveProperty('isEmail');
    });

    it('should fail validation when email is invalid', async () => {
      const forgotPasswordData = {
        email: 'invalid-email',
      };

      const forgotPasswordDto = plainToClass(
        ForgotPasswordDto,
        forgotPasswordData,
      );
      const errors = await validate(forgotPasswordDto);

      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('email');
      expect(errors[0].constraints).toHaveProperty('isEmail');
    });

    it('should handle email normalization', async () => {
      const forgotPasswordData = {
        email: '  USER@EXAMPLE.COM  ',
      };

      const forgotPasswordDto = plainToClass(
        ForgotPasswordDto,
        forgotPasswordData,
      );
      const errors = await validate(forgotPasswordDto);

      expect(errors).toHaveLength(0);
      expect(forgotPasswordDto.email).toBe('user@example.com');
    });
  });

  describe('ResetPasswordDto', () => {
    it('should validate a valid reset password DTO', async () => {
      const resetPasswordData = {
        prid: 123,
        token: 'reset-token-456',
        newPassword: 'NewPassword123!',
      };

      const resetPasswordDto = plainToClass(
        ResetPasswordDto,
        resetPasswordData,
      );
      const errors = await validate(resetPasswordDto);

      expect(errors).toHaveLength(0);
    });

    it('should fail validation when token is missing', async () => {
      const resetPasswordData = {
        prid: 123,
        newPassword: 'NewPassword123!',
      };

      const resetPasswordDto = plainToClass(
        ResetPasswordDto,
        resetPasswordData,
      );
      const errors = await validate(resetPasswordDto);

      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('token');
      expect(errors[0].constraints).toHaveProperty('isNotEmpty');
    });

    it('should fail validation when newPassword is too short', async () => {
      const resetPasswordData = {
        prid: 123,
        token: 'reset-token-456',
        newPassword: '123',
      };

      const resetPasswordDto = plainToClass(
        ResetPasswordDto,
        resetPasswordData,
      );
      const errors = await validate(resetPasswordDto);

      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('newPassword');
      expect(errors[0].constraints).toHaveProperty('minLength');
    });

    it('should fail validation when newPassword does not match regex', async () => {
      const resetPasswordData = {
        prid: 123,
        token: 'reset-token-456',
        newPassword: 'weakpassword',
      };

      const resetPasswordDto = plainToClass(
        ResetPasswordDto,
        resetPasswordData,
      );
      const errors = await validate(resetPasswordDto);

      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('newPassword');
      expect(errors[0].constraints).toHaveProperty('matches');
    });

    it('should pass validation with strong password', async () => {
      const strongPasswords = [
        'Password123!',
        'MyStr0ng@Pass',
        'Secure#Pass1',
        'C0mplex$Word',
      ];

      for (const password of strongPasswords) {
        const resetPasswordData = {
          prid: 123,
          token: 'reset-token-456',
          newPassword: password,
        };

        const resetPasswordDto = plainToClass(
          ResetPasswordDto,
          resetPasswordData,
        );
        const errors = await validate(resetPasswordDto);

        expect(errors).toHaveLength(0);
      }
    });

    it('should handle whitespace trimming', async () => {
      const resetPasswordData = {
        prid: 123,
        token: '  reset-token-456  ',
        newPassword: 'Password123!',
      };

      const resetPasswordDto = plainToClass(
        ResetPasswordDto,
        resetPasswordData,
      );
      const errors = await validate(resetPasswordDto);

      expect(errors).toHaveLength(0);
      expect(resetPasswordDto.prid).toBe(123);
      expect(resetPasswordDto.token).toBe('reset-token-456');
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long email addresses', async () => {
      const longEmail = 'a'.repeat(50) + '@' + 'b'.repeat(50) + '.com';
      const loginData = {
        email: longEmail,
        password: 'password123',
      };

      const loginDto = plainToClass(LoginDto, loginData);
      const errors = await validate(loginDto);

      expect(errors).toHaveLength(0);
    });
  });
});
