import { Controller, Get, Query } from '@nestjs/common'
import { AuthService } from '../auth.service'

@Controller('auth')
export class EmailVerificationController {
  constructor(private readonly auth: AuthService) {}

  /** GET  /auth/confirm-email?uid=…&token=… */
  @Get('confirm-email')
  confirmEmail(
    @Query('uid') uid: string,
    @Query('token') token: string,
  ) {
    return this.auth.confirmEmail(uid, token)
  }
}
