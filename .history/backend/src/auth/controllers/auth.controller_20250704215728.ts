import {
  Controller,
  Post,
  Body,
  Req,
  Res,
  UseGuards,
  UnauthorizedException,
  BadRequestException,
  Get,
  Patch,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService } from '../auth.service';
import { LoginDto, ForgotPasswordDto, ResetPasswordDto } from '../dto/auth.dto';
import { RegisterParentDto } from '../dto/register-parent.dto';
import { RegisterByInviteDto } from '../dto/register-by-invite.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { InvitationService } from '../../invitation/invitation.service';
import { Public } from '../../common/decorators/public.decorator';
import { CsrfGuard } from '../../common/guards/csrf.guard';
import { randomToken } from '../../utils/random-token';

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

  /* ──────────────── CSRF TOKEN ──────────────── */
  @Public()
  @Get('csrf')
  async getCsrfToken(@Res({ passthrough: true }) res: Response) {
    const csrf = randomToken(16);
    const prod = process.env.NODE_ENV === 'production';
    
    res.cookie('csrf_token', csrf, {
      httpOnly: false,
      secure: prod,
      sameSite: 'strict',
      maxAge: 2 * 24 * 60 * 60 * 1000,
    });

    return { csrf_token: csrf };
  }

  /* ──────────────── INSCRIPTION PAR INVITATION (publique) ──────────────── */
  @Public()
  @Post('register-by-invite')
  async registerByInvite(@Body() dto: RegisterByInviteDto) {
    // 1. Valider le token d'invitation
    const invitation = await this.invitationService.validateToken(dto.token);

    // 2. Vérifier que l'e-mail fourni correspond à celui de l'invitation
    if (dto.email !== invitation.email) {
      throw new BadRequestException(
        "L'adresse e-mail ne correspond pas à l'invitation.",
      );
    }

    // 3. Créer l'utilisateur avec le rôle défini par invitation.roleToAssign
    await this.authService.registerWithRole(dto, invitation.roleToAssign);

    // 4. Marquer le token comme utilisé
    await this.invitationService.markAsUsed(dto.token);

    return {
      message: 'Inscription réussie. Vous pouvez maintenant vous connecter.',
    };
  }

  /* ──────────────── CONNEXION ──────────────── */
  @Public()
  @UseGuards(CsrfGuard)
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { access_token, refresh_token, user } = await this.authService.login(
      dto.email,
      dto.password,
      dto.otpCode,
    );

    const prod = process.env.NODE_ENV === 'production';
    res.cookie('refresh_token', refresh_token, {
      httpOnly: true,
      secure: prod,
      sameSite: 'strict',
      maxAge: 2 * 24 * 60 * 60 * 1000,
    });

    // Génère un token CSRF aléatoire et le place dans un cookie accessible au front
    const csrf = randomToken(16);
    res.cookie('csrf_token', csrf, {
      httpOnly: false,
      secure: prod,
      sameSite: 'strict',
      maxAge: 2 * 24 * 60 * 60 * 1000,
    });

    return { access_token, user, csrf_token: csrf };
  }

  /* ──────────────── 2FA (initiate / verify) ──────────────── */
  @Public()
  @UseGuards(CsrfGuard)
  @Post('initiate-login')
  initiateLogin(@Body() body: { email: string; password: string }) {
    return this.authService.initiateLogin(body.email, body.password);
  }

  @Public()
  @UseGuards(CsrfGuard)
  @Post('verify-otp')
  async verifyOtp(
    @Body() body: { tempToken: string; otpCode: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    const { access_token, refresh_token, user } =
      await this.authService.verifyOtp(body.tempToken, body.otpCode);

    const prod = process.env.NODE_ENV === 'production';
    res.cookie('refresh_token', refresh_token, {
      httpOnly: true,
      secure: prod,
      sameSite: 'strict',
      maxAge: 2 * 24 * 60 * 60 * 1000,
    });

    const csrf = randomToken(16);
    res.cookie('csrf_token', csrf, {
      httpOnly: false,
      secure: prod,
      sameSite: 'strict',
      maxAge: 2 * 24 * 60 * 60 * 1000,
    });

    return { access_token, user, csrf_token: csrf };
  }

  /* ──────────────── LOGOUT / REFRESH ──────────────── */
  /*
   * Aucun access-token requis : l'authentification passe uniquement par le cookie refresh
   */
  @UseGuards(CsrfGuard)
  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = req.cookies['refresh_token'];
    await this.authService.logout(token);
    res.clearCookie('refresh_token', { sameSite: 'strict', secure: true });
    res.clearCookie('csrf_token', { sameSite: 'strict', secure: true });
    return { message: 'Logout successful' };
  }

  @UseGuards(CsrfGuard)
  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = req.cookies['refresh_token'];
    if (!token) throw new UnauthorizedException('Refresh token manquant');

    const { access_token, refresh_token } =
      await this.authService.refreshToken(token);

    const prod = process.env.NODE_ENV === 'production';
    res.cookie('refresh_token', refresh_token, {
      httpOnly: true,
      secure: prod,
      sameSite: 'strict',
      maxAge: 2 * 24 * 60 * 60 * 1000,
    });

    const csrf = randomToken(16);
    res.cookie('csrf_token', csrf, {
      httpOnly: false,
      secure: prod,
      sameSite: 'strict',
      maxAge: 2 * 24 * 60 * 60 * 1000,
    });

    return { access_token, csrf_token: csrf };
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
  @Post('enable-otp')
  @UseGuards(JwtAuthGuard, CsrfGuard)
  async enableOtp(@Req() req: any) {
    return this.authService.enableOtp(req.user.id);
  }

  @Post('disable-otp')
  @UseGuards(JwtAuthGuard)
  async disableOtp(@Req() req: any) {
    return this.authService.disableOtp(req.user.id);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Req() req: any) {
    return this.authService.getUserProfile(req.user.id);
  }

  @Get('profile/edit')
  @UseGuards(JwtAuthGuard)
  async getProfileForEdit(@Req() req: any) {
    return this.authService.getProfileForEdit(req.user.id);
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  async updateProfile(
    @Req() req: any,
    @Body() dto: { firstName?: string; lastName?: string; phone?: string },
  ) {
    return this.authService.updateProfile(req.user.id, dto);
  }
}
