import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { AuthService } from '../auth.service';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import * as speakeasy from 'speakeasy';
import * as qrcode from 'qrcode';

@Controller('auth')
export class OtpController {
  constructor(private authService: AuthService) {}

  @UseGuards(JwtAuthGuard)
  @Get('generate-otp')
  async generateOtp(@Req() req: any) {
    const user = req.user;
    const secret = speakeasy.generateSecret({ length: 20, name: `MonApp (${user.email})` });
    await this.authService.setUserOtpSecret(user.id, secret.base32);
    const qrCodeDataUrl = await qrcode.toDataURL(secret.otpauth_url);
    return { secret: secret.base32, qrCodeDataUrl };
  }
}
