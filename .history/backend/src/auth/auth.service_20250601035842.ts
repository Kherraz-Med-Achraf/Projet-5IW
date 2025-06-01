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
import { RegisterByInviteDto } from './dto/register-by-invite.dto';
import { Role } from '@prisma/client';

const PASSWORD_EXPIRATION_DAYS = 60;
const MAX_FAILED_ATTEMPTS      = 5;
const LOCK_DURATION_MS         = 60 * 60 * 1000; // 1 h

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private mailService: MailService,
  ) {}

  /* ────────────── INSCRIPTION « classique » PARENT ─────────────── */
  async registerParent(dto: RegisterParentDto) {
    const {
      email,
      password,
      passwordConfirm,
      children,
      emergencyContacts,
      ...parentData
    } = dto;

    if (await this.prisma.user.findUnique({ where: { email } })) {
      throw new BadRequestException('Email déjà utilisé');
    }
    if (password !== passwordConfirm) {
      throw new BadRequestException('Les mots de passe ne correspondent pas.');
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await this.prisma.user.create({
      data: {
        email,
        password: passwordHash,
        role: Role.PARENT,
        emailVerified: true,                                // pas de mail de vérif
        parentProfile: {
          create: {
            ...parentData,
            emergencyContacts: { create: emergencyContacts },
            children: {
              create: children.map(c => ({
                ...c,
                birthDate: new Date(c.birthDate),
              })),
            },
          },
        },
      },
    });

    return { message: 'Compte parent créé et actif immédiatement.' };
  }

  /* ────────────────────────────── LOGIN ────────────────────────── */
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

  private async storeHashedRefreshToken(userId: string, token: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: await bcrypt.hash(token, 10) },
    });
  }

  generateTokens(userId: string, email: string, role: string) {
    const payload = { sub: userId, email, role };
    return {
      access_token : this.jwtService.sign(payload, { expiresIn: '1h' }),
      refresh_token: this.jwtService.sign(payload, { expiresIn: '7d' }),
    };
  }

  async initiateLogin(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new HttpException('Identifiants invalides', HttpStatus.UNAUTHORIZED);

    await this.checkLockAndExpiration(user);

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      await this.recordFailedLogin(user);
      throw new HttpException('Identifiants invalides', HttpStatus.UNAUTHORIZED);
    }
    await this.resetFailedLogin(user);

    /* OTP pas activé → on envoie les tokens directs */
    if (!user.otpSecret) {
      const t = this.generateTokens(user.id, user.email, user.role);
      await this.storeHashedRefreshToken(user.id, t.refresh_token);
      return { ...t, user: { id: user.id, email: user.email, role: user.role } };
    }

    /* OTP activé → retour d’un token temporaire */
    const temp = this.jwtService.sign(
      { sub: user.id, email: user.email },
      { expiresIn: '5m' },
    );
    return { tempToken: temp, message: 'OTP requis' };
  }

  async verifyOtp(tempToken: string, otpCode: string) {
    try {
      const payload = this.jwtService.verify(tempToken);
      const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
      if (!user) throw new HttpException('Utilisateur non trouvé', HttpStatus.UNAUTHORIZED);

      await this.checkLockAndExpiration(user);

      const ok = speakeasy.totp.verify({
        secret : user.otpSecret,
        encoding: 'base32',
        token   : otpCode,
        window  : 1,
      });
      if (!ok) throw new HttpException('Code OTP invalide', HttpStatus.UNAUTHORIZED);

      const t = this.generateTokens(user.id, user.email, user.role);
      await this.storeHashedRefreshToken(user.id, t.refresh_token);
      return {
        ...t,
        user: { id: user.id, email: user.email, role: user.role, otpSecret: user.otpSecret },
      };
    } catch {
      throw new HttpException('Token temporaire invalide ou expiré', HttpStatus.UNAUTHORIZED);
    }
  }

  /* ───────────────────────── REFRESH / LOGOUT ───────────────────── */
  async refreshToken(token: string) {
    try {
      const payload = this.jwtService.verify(token);
      const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
      if (!user || !user.refreshToken) {
        throw new HttpException('Refresh token invalide', HttpStatus.UNAUTHORIZED);
      }
      const ok = await bcrypt.compare(token, user.refreshToken);
      if (!ok) {
        await this.prisma.user.update({ where: { id: user.id }, data: { refreshToken: null } });
        throw new HttpException('Refresh token révoqué', HttpStatus.UNAUTHORIZED);
      }
      const t = this.generateTokens(user.id, user.email, user.role);
      await this.storeHashedRefreshToken(user.id, t.refresh_token);
      return t;
    } catch {
      throw new HttpException('Refresh token invalide', HttpStatus.UNAUTHORIZED);
    }
  }

  async logout(refreshToken: string) {
    if (!refreshToken) return;
    try {
      const payload = this.jwtService.verify(refreshToken);
      const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
      if (user?.refreshToken && (await bcrypt.compare(refreshToken, user.refreshToken))) {
        await this.prisma.user.update({ where: { id: user.id }, data: { refreshToken: null } });
      }
    } catch {}
  }

  /* ───────────────────────────── OTP enable / disable ───────────── */
  async enableOtp(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new HttpException('Utilisateur introuvable', HttpStatus.NOT_FOUND);
    if (user.otpSecret) throw new HttpException('OTP déjà activé', HttpStatus.BAD_REQUEST);

    const secret = speakeasy.generateSecret({ length: 20, name: 'MyApp', issuer: 'MyApp' });
    await this.prisma.user.update({ where: { id: userId }, data: { otpSecret: secret.base32 } });

    return { secret: secret.base32, qrCodeDataUrl: await qrcode.toDataURL(secret.otpauth_url!) };
  }

  async disableOtp(userId: string) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data : { otpSecret: null },
    });
    const t = this.generateTokens(user.id, user.email, user.role);
    await this.storeHashedRefreshToken(user.id, t.refresh_token);
    return { ...t, user: { id: user.id, email: user.email, role: user.role }, message: 'OTP désactivé' };
  }

  /* ───────────────────── INSCRIPTION VIA INVITATION ─────────────── */
  async registerWithRole(dto: RegisterByInviteDto, forcedRole: Role) {
    const {
      email,
      password,
      passwordConfirm,
      children          = [],
      emergencyContacts = [],
      ...parentData     // firstName, lastName, phone, address, legalResponsibility…
    } = dto;

    if (password !== passwordConfirm) {
      throw new BadRequestException('Les mots de passe ne correspondent pas.');
    }
    if (await this.prisma.user.findUnique({ where: { email } })) {
      throw new BadRequestException('Cet e-mail est déjà utilisé.');
    }

    /* children */
    const childCreates = (children as { firstName?: string; lastName?: string; birthDate: string }[])
      .filter(c => c.firstName && c.lastName && c.birthDate)
      .map(c => ({
        firstName: c.firstName!.trim(),
        lastName : c.lastName!.trim(),
        birthDate: new Date(c.birthDate),
      }));

    /* contacts */
    type RawContact = {
      firstName?: string; lastName?: string; phone?: string;
      relation?: string;  relationOther?: string;
    };
    const contactCreates = (Array.isArray(emergencyContacts) ? emergencyContacts : [] as RawContact[])
      .filter(c => c.firstName || c.lastName || c.phone)
      .map(c => ({
        name : `${(c.firstName ?? '').trim()} ${(c.lastName ?? '').trim()}`.trim(),
        phone: (c.phone ?? '').trim() || undefined,
        relation: c.relation === 'Autre' && c.relationOther
          ? `Autre: ${c.relationOther.trim()}`
          : (c.relation ?? 'Autre'),
      }));

    const passwordHash = await bcrypt.hash(password, 10);

    if (forcedRole === Role.PARENT) {
      return this.prisma.user.create({
        data: {
          email,
          password: passwordHash,
          role: Role.PARENT,
          emailVerified: true,
          parentProfile: {
            create: {
              ...parentData,
              ...(contactCreates.length && { emergencyContacts: { create: contactCreates } }),
              ...(childCreates.length   && { children:          { create: childCreates } }),
            },
          },
        },
      });
    }

    /* STAFF / DIRECTOR / ADMIN … */
    return this.prisma.user.create({
      data: { email, password: passwordHash, role: forcedRole, emailVerified: true },
    });
  }

  /* ───────────────────────────── MOT DE PASSE OUBLIÉ ──────────────────── */
  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) return { message: "Si l'adresse existe, un lien vient d'être envoyé." };

    const plain  = crypto.randomBytes(32).toString('hex');
    const hashed = await bcrypt.hash(plain, 10);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    const { id } = await this.prisma.passwordReset.create({
      data: { token: hashed, expiresAt, userId: user.id },
    });

    const link = `http://localhost:5173/reset-password?prid=${id}&token=${plain}`;
    await this.mailService.sendMail(
      user.email,
      'Réinitialisation de mot de passe',
      `<p>Cliquez pour réinitialiser votre mot de passe :</p><a href="${link}">Réinitialiser</a>`,
    );
    return { message: "Si l'adresse existe, un lien vient d'être envoyé." };
  }

  async resetPassword(prid: number, plain: string, newPwd: string) {
    const rec = await this.prisma.passwordReset.findUnique({
      where: { id: prid },
      include: { user: true },
    });
    if (!rec || rec.expiresAt < new Date()) {
      throw new NotFoundException('Token invalide ou expiré');
    }
    const ok = await bcrypt.compare(plain, rec.token);
    if (!ok) throw new NotFoundException('Token invalide ou expiré');

    await this.prisma.user.update({
      where: { id: rec.userId },
      data : { password: await bcrypt.hash(newPwd, 10) },
    });
    await this.prisma.passwordReset.delete({ where: { id: prid } });

    return { message: 'Mot de passe réinitialisé.' };
  }
}
