// src/auth/controllers/email-verification.controller.ts
import { Controller, Get, Query } from '@nestjs/common';
import { AuthService } from '../auth.service';
import { Public } from '../../common/decorators/public.decorator';

@Controller('auth')
export class EmailVerificationController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Get('confirm-email')
  async confirmEmail(
    @Query('uid') uid: string,
    @Query('token') token: string,
  ) {
    return this.auth.confirmEmail(uid, token);
  }
}
