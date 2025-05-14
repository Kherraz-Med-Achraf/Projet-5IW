import {
  Controller,
  Post,
  Body,
  Req,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service';
import {
  RegisterDto,
  LoginDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from './dto/auth.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    const { access_token, refresh_token, user } =
      await this.authService.register(dto.email, dto.password);
    return { access_token, refresh_token, user };
  }

  /**
   * Étape 1 du login (si on utilise un flux en 2 temps).
   */
  @Post('initiate-login')
  async initiateLogin(@Body() body: { email: string; password: string }) {
    return this.authService.initiateLogin(body.email, body.password);
  }

  /**
   * Étape 2 du login (vérification OTP).
   */
  @Post('verify-otp')
  async verifyOtp(@Body() body: { tempToken: string; otpCode: string }) {
    const { access_token, refresh_token, user } =
      await this.authService.verifyOtp(body.tempToken, body.otpCode);
    return { access_token, refresh_token, user };
  }

  /**
   * Login "classique" (un seul appel)
   */
  @Post('login')
  async login(@Body() dto: LoginDto) {
    const { access_token, refresh_token, user } =
      await this.authService.login(dto.email, dto.password, dto.otpCode);
    return { access_token, refresh_token, user };
  }

  @Post('logout')
  async logout(@Req() req: Request) {
    // Ici, on peut laisser tel quel ou adapter selon votre politique de déconnexion.
    const refreshToken = req.cookies?.refresh_token;
    await this.authService.logout(refreshToken);
    return { message: 'Logout successful' };
  }

  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.prid, dto.token, dto.newPassword);
  }

  /**
   * Route refresh modifiée pour lire le refreshToken depuis le header 'x-refresh-token'
   */
  @Post('refresh')
  async refresh(@Req() req: Request) {
    const refreshToken = req.headers['x-refresh-token'] as string;
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token manquant');
    }
    return this.authService.refreshToken(refreshToken);
  }

  /**
   * Active l'OTP pour l'utilisateur courant.
   */
  @UseGuards(JwtAuthGuard)
  @Post('enable-otp')
  async enableOtp(@Req() req: Request) {
    const user = req.user as { id?: string };
    if (!user?.id) {
      throw new UnauthorizedException('Utilisateur invalide ou ID manquant');
    }
    return this.authService.enableOtp(user.id);
  }

  /**
   * Désactive l'OTP (met otpSecret à null).
   */
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
