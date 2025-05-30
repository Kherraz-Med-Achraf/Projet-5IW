// backend/src/auth/auth.controller.ts
import {
  Controller,
  Post,
  Body,
  Req,
  Res,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import {
  RegisterDto,
  LoginDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from './dto/auth.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

const COOKIE_NAME = 'refresh_token';
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/auth/refresh',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { access_token, refresh_token, user } =
      await this.authService.register(dto.email, dto.password);

    res.cookie(COOKIE_NAME, refresh_token, COOKIE_OPTIONS);

    return { access_token, user };
  }

  @Post('initiate-login')
  async initiateLogin(
    @Body() body: { email: string; password: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.initiateLogin(
      body.email,
      body.password,
    );

    // si on a un refresh_token (OTP désactivé)
    if ('refresh_token' in result) {
      res.cookie(COOKIE_NAME, result.refresh_token, COOKIE_OPTIONS);
      delete (result as any).refresh_token;
    }
    return result;
  }

  @Post('verify-otp')
  async verifyOtp(
    @Body() body: { tempToken: string; otpCode: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    const { access_token, refresh_token, user } =
      await this.authService.verifyOtp(body.tempToken, body.otpCode);

    res.cookie(COOKIE_NAME, refresh_token, COOKIE_OPTIONS);

    return { access_token, user };
  }

  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { access_token, refresh_token, user } =
      await this.authService.login(dto.email, dto.password, dto.otpCode);

    res.cookie(COOKIE_NAME, refresh_token, COOKIE_OPTIONS);

    return { access_token, user };
  }

  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = req.cookies[COOKIE_NAME];
    if (!token) {
      throw new UnauthorizedException('Refresh token manquant');
    }

    const { access_token, refresh_token } =
      await this.authService.refreshToken(token);

    // on remplace le cookie
    res.cookie(COOKIE_NAME, refresh_token, COOKIE_OPTIONS);

    return { access_token };
  }

  @Post('logout')
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = req.cookies[COOKIE_NAME];
    await this.authService.logout(token);

    // on supprime le cookie
    res.clearCookie(COOKIE_NAME, { path: COOKIE_OPTIONS.path });

    return { message: 'Déconnexion réussie' };
  }

  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(
      dto.prid,
      dto.token,
      dto.newPassword,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('enable-otp')
  async enableOtp(@Req() req: Request) {
    const user = req.user as { id?: string };
    if (!user?.id) {
      throw new UnauthorizedException('Utilisateur invalide ou ID manquant');
    }
    return this.authService.enableOtp(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('disable-otp')
  async disableOtp(@Req() req: Request) {
    const user = req.user as { id?: string };
    if (!user?.id) {
      throw new UnauthorizedException('Utilisateur invalide ou ID manquant');
    }
    return this.authService.disableOtp(user.id);
  }
}
