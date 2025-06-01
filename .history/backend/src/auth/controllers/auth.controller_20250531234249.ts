import {
  Controller,
  Post,
  Body,
  Req,
  Res,
  UseGuards,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService } from '../auth.service';
import {
  LoginDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from '../dto/auth.dto';
import { RegisterParentDto } from '../dto/register-parent.dto';
import { RegisterByInviteDto } from '../dto/register-by-invite.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { InvitationService } from '../../invitation/invitation.service';
import { Public } from '../../common/decorators/public.decorator';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly invitationService: InvitationService,
  ) {}

  /* ──────────────── INSCRIPTION PARENT (protégé) ──────────────── */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SERVICE_MANAGER, Role.DIRECTOR, Role.ADMIN)
  @Post('register')
  async registerParent(@Body() dto: RegisterParentDto) {
    return this.authService.registerParent(dto);
  }

  /* ──────────────── INSCRIPTION PAR INVITATION (publique) ──────────────── */
  @Public()
  @Post('register-by-invite')
  async registerByInvite(@Body() dto: RegisterByInviteDto) {
    // 1. Valider le token d’invitation
    const invitation = await this.invitationService.validateToken(dto.token);

    // 2. Vérifier que l’e-mail fourni correspond à celui de l’invitation
    if (dto.email !== invitation.email) {
      throw new BadRequestException('L’adresse e-mail ne correspond pas à l’invitation.');
    }

    // 3. Créer l’utilisateur avec le rôle défini par invitation.roleToAssign
    await this.authService.registerWithRole(dto, invitation.roleToAssign);

    // 4. Marquer le token comme utilisé
    await this.invitationService.markAsUsed(dto.token);

    return { message: 'Inscription réussie. Vous pouvez maintenant vous connecter.' };
  }

  /* ──────────────── CONNEXION ──────────────── */
  @Public()
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

  /* ──────────────── 2FA (initiate / verify) ──────────────── */
  @Public()
  @Post('initiate-login')
  initiateLogin(@Body() body: { email: string; password: string }) {
    return this.authService.initiateLogin(body.email, body.password);
  }

  @Public()
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

  /* ──────────────── LOGOUT / REFRESH ──────────────── */
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = req.cookies['refresh_token'];
    await this.authService.logout(token);
    res.clearCookie('refresh_token', { sameSite: 'strict', secure: true });
    return { message: 'Logout successful' };
  }

  @UseGuards(JwtAuthGuard)
  @Post('refresh')
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = req.cookies['refresh_token'];
    if (!token) throw new UnauthorizedException('Refresh token manquant');

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

  /* ──────────────── MOT DE PASSE OUBLIÉ / RESET ──────────────── */
  @Public()
  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Public()
  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.prid, dto.token, dto.newPassword);
  }

  /* ──────────────── ENABLE / DISABLE OTP ──────────────── */
  @UseGuards(JwtAuthGuard)
  @Post('enable-otp')
  async enableOtp(@Req() req: Request) {
    const user = req.user as { id?: string };
    if (!user?.id) throw new UnauthorizedException('Utilisateur invalide');
    return this.authService.enableOtp(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('disable-otp')
  async disableOtp(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const user = req.user as { id?: string };
    if (!user?.id) throw new UnauthorizedException('Utilisateur invalide');

    const { access_token, refresh_token } =
      await this.authService.disableOtp(user.id);

    res.cookie('refresh_token', refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    return { access_token };
  }
}
