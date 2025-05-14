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

    // 1) on stocke le refreshToken en cookie
    res.cookie('refresh_token', refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    return { access_token, user };
  }

  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { access_token, refresh_token, user } =
      await this.authService.login(dto.email, dto.password, dto.otpCode);

    res.cookie('refresh_token', refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return { access_token, user };
  }

  @Post('initiate-login')
  async initiateLogin(@Body() body: { email: string; password: string }) {
    return this.authService.initiateLogin(body.email, body.password);
  }

  @Post('verify-otp')
  async verifyOtp(
    @Body() body: { tempToken: string; otpCode: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    const { access_token, refresh_token, user } =
      await this.authService.verifyOtp(body.tempToken, body.otpCode);

    res.cookie('refresh_token', refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return { access_token, user };
  }

  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = req.cookies['refresh_token'];
    await this.authService.logout(token);
    res.clearCookie('refresh_token', { sameSite: 'strict', secure: true });

    return { message: 'Logout successful' };
  }

  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = req.cookies['refresh_token'];
    if (!token) {
      throw new UnauthorizedException('Refresh token manquant');
    }

    const { access_token, refresh_token } =
      await this.authService.refreshToken(token);
    res.cookie('refresh_token', refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return { access_token };
  }

  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.prid, dto.token, dto.newPassword);
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
  async disableOtp(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const user = req.user as { id?: string };
    if (!user?.id) {
      throw new UnauthorizedException('Utilisateur invalide');
    }

    // 1. désactive l’OTP et renvoie de nouveaux tokens
    const { access_token, refresh_token } =
      await this.authService.disableOtp(user.id);

    // 2. pose le nouveau refresh_token en cookie
    res.cookie('refresh_token', refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    // 3. renvoie le nouvel access_token
    return { access_token };
  }
}
