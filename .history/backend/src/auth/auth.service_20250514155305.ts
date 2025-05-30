import {
  Injectable,
  HttpException,
  HttpStatus,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import * as speakeasy from 'speakeasy';
import * as qrcode from 'qrcode';
import { MailService } from '../mail/mail.service';
import { RegisterParentDto } from './dto/register-parent.dto';

const PASSWORD_EXPIRATION_DAYS = 60;
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 60 * 60 * 1000;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
  ) {}

  /* ─────────────────────────────────────────────────────────────
   *  Nouveau flux : inscription Parent (multi-étapes)
   * ───────────────────────────────────────────────────────────── */
  async registerParent(dto: RegisterParentDto) {
    const {
      email,
      password,
      passwordConfirm, // validé par Match()
      children,
      emergencyContacts,
      ...parentData // firstName, lastName, phone, address, legalResponsibility, notificationPrefs
    } = dto;

    // 1. Unicité email
    if (await this.prisma.user.findUnique({ where: { email } })) {
      throw new BadRequestException('Email déjà utilisé');
    }

    // 2. Hash mot de passe
    const passwordHash = await bcrypt.hash(password, 10);

    // 3. Transaction : User → ParentProfile → Children + Contacts
    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          password: passwordHash,
          role: 'USER',
          parentProfile: {
            create: {
              ...parentData,
              emergencyContacts: { create: emergencyContacts },
              children: { create: children },
            },
          },
        },
        include: { parentProfile: true },
      });

      // 4. Tokens & stockage refresh
      const tokens = this.generateTokens(user.id, user.email, user.role);
      await tx.user.update({
        where: { id: user.id },
        data: {
          refreshToken: await bcrypt.hash(tokens.refresh_token, 10),
        },
      });

      return { user, ...tokens };
    });

    return {
      access_token: result.access_token,
      refresh_token: result.refresh_token,
      user: {
        id: result.user.id,
        email: result.user.email,
        role: result.user.role,
        parentProfile: result.user.parentProfile,
      },
    };
  }

  /* ─────────────────────────────────────────────────────────────
   *  Méthodes existantes (connexion, refresh, OTP, etc.)
   * ───────────────────────────────────────────────────────────── */

  private async checkLockAndExpiration(user: any) {
    const now = new Date();
    if (user.lockUntil && user.lockUntil > now) {
      throw new HttpException(
        `Compte bloqué jusqu'à ${user.lockUntil.toISOString()}`,
        HttpStatus.LOCKED,
      );
    }
    const expirationDate = new Date(
      user.passwordChangedAt.getTime() +
        PASSWORD_EXPIRATION_DAYS * 24 * 60 * 60 * 1000,
    );
    if (user.forcePasswordReset || expirationDate < now) {
      throw new ForbiddenException(
        'Votre mot de passe a expiré, veuillez le réinitialiser',
      );
    }
  }

  private async recordFailedLogin(user: any) {
    let failed = user.failedLoginAttempts + 1;
    let lockUntil = user.lockUntil;
    if (failed >= MAX_FAILED_ATTEMPTS) {
      lockUntil = new Date(Date.now() + LOCK_DURATION_MS);
      failed = 0;
    }
    await this.prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: failed, lockUntil },
    });
  }

  private async resetFailedLogin(user: any) {
    await this.prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, lockUntil: null },
    });
  }

  private async hashRefreshToken(token: string) {
    return bcrypt.hash(token, 10);
  }

  private async storeHashedRefreshToken(userId: string, token: string) {
    const hashed = await this.hashRefreshToken(token);
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: hashed },
    });
  }

  generateTokens(userId: string, email: string, role: string) {
    const payload = { sub: userId, email, role };
    return {
      access_token: this.jwtService.sign(payload, { expiresIn: '1h' }),
      refresh_token: this.jwtService.sign(payload, { expiresIn: '7d' }),
    };
  }

  /* ─── L’ancienne méthode register(email, password) peut rester
         si tu en as encore l’usage pour des comptes internes. ─── */

  async register(email: string, password: string) {
    const existingUser = await this.prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new HttpException('Utilisateur déjà existant', HttpStatus.BAD_REQUEST);
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role: 'USER',
        passwordChangedAt: new Date(),
        forcePasswordReset: false,
      },
    });
    const tokens = this.generateTokens(user.id, user.email, user.role);
    await this.storeHashedRefreshToken(user.id, tokens.refresh_token);
    return {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      user: { id: user.id, email: user.email, role: user.role },
    };
  }

  /* ─────────────────── Connexion & OTP ─────────────────── */

  async initiateLogin(email: string, password: string) { /* … (inchangé) … */ }
  async verifyOtp(tempToken: string, otpCode: string) { /* … (inchangé) … */ }
  async login(email: string, password: string, otpCode?: string) { /* … */ }

  /* ───────────── Refresh, Logout, Forgot / Reset ───────────── */

  async refreshToken(token: string) { /* … (inchangé) … */ }
  async logout(refreshToken: string) { /* … (inchangé) … */ }
  async forgotPassword(email: string) { /* … (inchangé) … */ }
  async resetPassword(prid: number, tokenPlain: string, newPassword: string) { /* … */ }

  /* ───────────────────── OTP management ───────────────────── */

  async enableOtp(userId: string) { /* … (inchangé) … */ }
  async setUserOtpSecret(userId: string, otpSecret: string) { /* … */ }
  async disableOtp(userId: string) { /* … */ }
}
