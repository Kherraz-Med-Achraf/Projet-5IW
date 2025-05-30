import {
  Controller,
  Post,
  Body,
  Req,
  Res,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common'
import { Request, Response } from 'express'
import { AuthService } from '../auth.service'
import {
  LoginDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from '../dto/auth.dto'
import { RegisterParentDto } from '../dto/register-parent.dto'
import { JwtAuthGuard } from '../../guards/jwt-auth.guard'

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /* ──────────────── INSCRIPTION PARENT ──────────────── */
  @Post('register')
  async registerParent(@Body() dto: RegisterParentDto) {
    // Option 2 : on ne connecte pas l’utilisateur,
    // on renvoie seulement le message de confirmation
    return this.authService.registerParent(dto)
  }

  /* ──────────────── CONNEXION ──────────────── */
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { access_token, refresh_token, user } =
      await this.authService.login(dto.email, dto.password, dto.otpCode)

    res.cookie('refresh_token', refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    })

    return { access_token, user }
  }

  /* ──────────────── 2FA (initiate / verify) ──────────────── */
  @Post('initiate-login')
  initiateLogin(@Body() body: { email: string; password: string }) {
    return this.authService.initiateLogin(body.email, body.password)
  }

  @Post('verify-otp')
  async verifyOtp(
    @Body() body: { tempToken: string; otpCode: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    const { access_token, refresh_token, user } =
      await this.authService.verifyOtp(body.tempToken, body.otpCode)

    res.cookie('refresh_token', refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    })

    return { access_token, user }
  }

  /* ──────────────── LOGOUT / REFRESH ──────────────── */
  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = req.cookies['refresh_token']
    await this.authService.logout(token)
    res.clearCookie('refresh_token', { sameSite: 'strict', secure: true })
    return { message: 'Logout successful' }
  }

  @Post('refresh')
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = req.cookies['refresh_token']
    if (!token) throw new UnauthorizedException('Refresh token manquant')

    const { access_token, refresh_token } =
      await this.authService.refreshToken(token)

    res.cookie('refresh_token', refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    })
    return { access_token }
  }

  /* ──────────────── MOT DE PASSE OUBLIÉ / RESET ──────────────── */
  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email)
  }

  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.prid, dto.token, dto.newPassword)
  }

  /* ──────────────── ENABLE / DISABLE OTP ──────────────── */
  @UseGuards(JwtAuthGuard)
  @Post('enable-otp')
  async enableOtp(@Req() req: Request) {
    const user = req.user as { id?: string }
    if (!user?.id) throw new UnauthorizedException('Utilisateur invalide')
    return this.authService.enableOtp(user.id)
  }

  @UseGuards(JwtAuthGuard)
  @Post('disable-otp')
  async disableOtp(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const user = req.user as { id?: string }
    if (!user?.id) throw new UnauthorizedException('Utilisateur invalide')

    const { access_token, refresh_token } =
      await this.authService.disableOtp(user.id)

    res.cookie('refresh_token', refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    })
    return { access_token }
  }
}
