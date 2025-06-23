import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from '../auth.service';
import { InvitationService } from '../../invitation/invitation.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CsrfGuard } from '../../common/guards/csrf.guard';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Response, Request } from 'express';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;
  let invitationService: jest.Mocked<InvitationService>;

  const mockAuthService = {
    registerParent: jest.fn(),
    registerWithRole: jest.fn(),
    login: jest.fn(),
    initiateLogin: jest.fn(),
    verifyOtp: jest.fn(),
    logout: jest.fn(),
    refreshToken: jest.fn(),
    forgotPassword: jest.fn(),
    resetPassword: jest.fn(),
    enableOtp: jest.fn(),
    disableOtp: jest.fn(),
  };

  const mockInvitationService = {
    validateToken: jest.fn(),
    markAsUsed: jest.fn(),
  };

  const mockResponse = {
    cookie: jest.fn(),
    clearCookie: jest.fn(),
  } as unknown as Response;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: InvitationService, useValue: mockInvitationService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideGuard(CsrfGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
    invitationService = module.get(InvitationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('registerParent', () => {
    it('should register a parent successfully', async () => {
      const registerDto = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'Password123!',
        passwordConfirm: 'Password123!',
        phone: '0123456789',
        address: '123 Main St',
        legalResponsibility: 'Tuteur',
        children: [],
      };

      const expectedResult = { message: 'Parent registered successfully' };
      mockAuthService.registerParent.mockResolvedValue(expectedResult);

      const result = await controller.registerParent(registerDto);

      expect(authService.registerParent).toHaveBeenCalledWith(registerDto);
      expect(result).toEqual(expectedResult);
    });

    it('should have proper role guards', () => {
      const guards = Reflect.getMetadata('__guards__', controller.registerParent);
      expect(guards).toBeDefined();
    });
  });

  describe('registerByInvite', () => {
    const inviteDto = {
      token: 'valid-token',
      email: 'user@example.com',
      password: 'Password123!',
      passwordConfirm: 'Password123!',
      firstName: 'Jane',
      lastName: 'Smith',
      phone: '0123456789',
      address: '123 Main St',
      legalResponsibility: 'Tuteur',
    };

    it('should register by invitation successfully', async () => {
      const mockInvitation = {
        email: 'user@example.com',
        roleToAssign: Role.SECRETARY,
        token: 'valid-token',
      };

      mockInvitationService.validateToken.mockResolvedValue(mockInvitation);
      mockAuthService.registerWithRole.mockResolvedValue(undefined);
      mockInvitationService.markAsUsed.mockResolvedValue(undefined);

      const result = await controller.registerByInvite(inviteDto);

      expect(invitationService.validateToken).toHaveBeenCalledWith('valid-token');
      expect(authService.registerWithRole).toHaveBeenCalledWith(inviteDto, Role.SECRETARY);
      expect(invitationService.markAsUsed).toHaveBeenCalledWith('valid-token');
      expect(result.message).toContain('Inscription réussie');
    });

    it('should throw BadRequestException when email does not match invitation', async () => {
      const mockInvitation = {
        email: 'different@example.com',
        roleToAssign: Role.SECRETARY,
        token: 'valid-token',
      };

      mockInvitationService.validateToken.mockResolvedValue(mockInvitation);

      await expect(controller.registerByInvite(inviteDto))
        .rejects.toThrow(BadRequestException);
      
      expect(authService.registerWithRole).not.toHaveBeenCalled();
      expect(invitationService.markAsUsed).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    const loginDto = {
      email: 'user@example.com',
      password: 'password123',
    };

    it('should login successfully without OTP', async () => {
      const mockLoginResult = {
        access_token: 'jwt-token',
        refresh_token: 'refresh-token',
        user: { id: '1', email: 'user@example.com' },
      };

      mockAuthService.login.mockResolvedValue(mockLoginResult);

      const result = await controller.login(loginDto, mockResponse);

      expect(authService.login).toHaveBeenCalledWith(
        loginDto.email,
        loginDto.password,
        undefined
      );
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'refresh_token',
        'refresh-token',
        expect.objectContaining({ httpOnly: true })
      );
      expect(result.access_token).toBe('jwt-token');
      expect(result.user).toEqual(mockLoginResult.user);
      expect(result.csrf_token).toBeDefined();
    });

    it('should login successfully with OTP', async () => {
      const loginDtoWithOtp = { ...loginDto, otpCode: '123456' };
      const mockLoginResult = {
        access_token: 'jwt-token',
        refresh_token: 'refresh-token',
        user: { id: '1', email: 'user@example.com' },
      };

      mockAuthService.login.mockResolvedValue(mockLoginResult);

      await controller.login(loginDtoWithOtp, mockResponse);

      expect(authService.login).toHaveBeenCalledWith(
        loginDto.email,
        loginDto.password,
        '123456'
      );
    });
  });

  describe('initiateLogin', () => {
    it('should initiate login for 2FA', async () => {
      const body = { email: 'user@example.com', password: 'password123' };
      const mockResult = { tempToken: 'temp-token', requiresOtp: true };

      mockAuthService.initiateLogin.mockResolvedValue(mockResult);

      const result = await controller.initiateLogin(body);

      expect(authService.initiateLogin).toHaveBeenCalledWith(body.email, body.password);
      expect(result).toEqual(mockResult);
    });
  });

  describe('verifyOtp', () => {
    it('should verify OTP and complete login', async () => {
      const body = { tempToken: 'temp-token', otpCode: '123456' };
      const mockResult = {
        access_token: 'jwt-token',
        refresh_token: 'refresh-token',
        user: { id: '1', email: 'user@example.com' },
      };

      mockAuthService.verifyOtp.mockResolvedValue(mockResult);

      const result = await controller.verifyOtp(body, mockResponse);

      expect(authService.verifyOtp).toHaveBeenCalledWith(body.tempToken, body.otpCode);
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'refresh_token',
        'refresh-token',
        expect.objectContaining({ httpOnly: true })
      );
      expect(result.access_token).toBe('jwt-token');
      expect(result.csrf_token).toBeDefined();
    });
  });

  describe('logout', () => {
    it('should logout successfully', async () => {
      const mockRequest = {
        cookies: { refresh_token: 'refresh-token' }
      } as Request;

      mockAuthService.logout.mockResolvedValue(undefined);

      const result = await controller.logout(mockRequest, mockResponse);

      expect(authService.logout).toHaveBeenCalledWith('refresh-token');
      expect(mockResponse.clearCookie).toHaveBeenCalledWith(
        'refresh_token',
        expect.objectContaining({ sameSite: 'strict' })
      );
      expect(mockResponse.clearCookie).toHaveBeenCalledWith(
        'csrf_token',
        expect.objectContaining({ sameSite: 'strict' })
      );
      expect(result.message).toBe('Logout successful');
    });
  });

  describe('refresh', () => {
    it('should refresh token successfully', async () => {
      const mockRequest = {
        cookies: { refresh_token: 'refresh-token' }
      } as Request;

      const mockResult = {
        access_token: 'new-jwt-token',
        refresh_token: 'new-refresh-token',
      };

      mockAuthService.refreshToken.mockResolvedValue(mockResult);

      const result = await controller.refresh(mockRequest, mockResponse);

      expect(authService.refreshToken).toHaveBeenCalledWith('refresh-token');
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'refresh_token',
        'new-refresh-token',
        expect.objectContaining({ httpOnly: true })
      );
      expect(result.access_token).toBe('new-jwt-token');
      expect(result.csrf_token).toBeDefined();
    });

    it('should throw UnauthorizedException when refresh token is missing', async () => {
      const mockRequest = { cookies: {} } as Request;

      await expect(controller.refresh(mockRequest, mockResponse))
        .rejects.toThrow(UnauthorizedException);
      
      expect(authService.refreshToken).not.toHaveBeenCalled();
    });
  });

  describe('forgotPassword', () => {
    it('should initiate password reset', async () => {
      const dto = { email: 'user@example.com' };
      const mockResult = { message: 'Reset email sent' };

      mockAuthService.forgotPassword.mockResolvedValue(mockResult);

      const result = await controller.forgotPassword(dto);

      expect(authService.forgotPassword).toHaveBeenCalledWith(dto.email);
      expect(result).toEqual(mockResult);
    });
  });

  describe('resetPassword', () => {
    it('should reset password successfully', async () => {
      const dto = {
        prid: 123,
        token: 'reset-token',
        newPassword: 'NewPassword123!',
      };
      const mockResult = { message: 'Password reset successful' };

      mockAuthService.resetPassword.mockResolvedValue(mockResult);

      const result = await controller.resetPassword(dto);

      expect(authService.resetPassword).toHaveBeenCalledWith(
        dto.prid,
        dto.token,
        dto.newPassword
      );
      expect(result).toEqual(mockResult);
    });
  });

  describe('enableOtp', () => {
    it('should enable OTP for authenticated user', async () => {
      const mockRequest = {
        user: { id: 'user-id' }
      } as any;

      const mockResult = { qrCode: 'qr-code-data', secret: 'secret' };
      mockAuthService.enableOtp.mockResolvedValue(mockResult);

      const result = await controller.enableOtp(mockRequest);

      expect(authService.enableOtp).toHaveBeenCalledWith('user-id');
      expect(result).toEqual(mockResult);
    });

    it('should throw UnauthorizedException when user is invalid', async () => {
      const mockRequest = { user: {} } as any;

      await expect(controller.enableOtp(mockRequest))
        .rejects.toThrow(UnauthorizedException);
    });
  });

  describe('Guards and Decorators', () => {
    it('should have @Public decorator on public endpoints', () => {
      const publicMethods = [
        'registerByInvite',
        'login',
        'initiateLogin',
        'verifyOtp',
        'forgotPassword',
        'resetPassword'
      ];

      publicMethods.forEach(method => {
        const isPublic = Reflect.getMetadata('isPublic', controller[method]);
        expect(isPublic).toBe(true);
      });
    });

    it('should have proper guards on protected endpoints', () => {
      const protectedMethods = ['registerParent', 'enableOtp'];
      
      protectedMethods.forEach(method => {
        const guards = Reflect.getMetadata('__guards__', controller[method]);
        expect(guards).toBeDefined();
      });
    });
  });
}); 