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
import { randomToken } from '../utils/random-token'


const PASSWORD_EXPIRATION_DAYS = 60;
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 60 * 60 * 1000;

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private mailService: MailService,
  ) {}

  async registerParent(dto: RegisterParentDto) {
    const { email, password, passwordConfirm, children, emergencyContacts, ...parentData } = dto
  
    if (await this.prisma.user.findUnique({ where: { email } })) {
      throw new BadRequestException('Email déjà utilisé')
    }
  
    const passwordHash = await bcrypt.hash(password, 10)
  
    /* création atomique du compte + profil parent */
    const { id, email: mail } = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          password: passwordHash,
          role: 'USER',
          parentProfile: {
            create: {
              ...parentData,
              emergencyContacts: { create: emergencyContacts },
              children: {
                create: children.map((c) => ({
                  ...c,
                  birthDate: new Date(c.birthDate),
                })),
              },
            },
          },
        },
      })
      return user
    })
  
    /* envoi du lien de confirmation */
    await this.sendEmailVerification(id, mail)
  
    return {
      message:
        'Compte créé. Un lien de confirmation vient de vous être envoyé.',
    }
  }

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
    const access_token = this.jwtService.sign(payload, { expiresIn: '1h' });
    const refresh_token = this.jwtService.sign(payload, { expiresIn: '7d' });
    return { access_token, refresh_token };
  }

  async register(email: string, password: string) {
    if (await this.prisma.user.findUnique({ where: { email } })) {
      throw new HttpException('Utilisateur déjà existant', HttpStatus.BAD_REQUEST)
    }
  
    const hashedPassword = await bcrypt.hash(password, 10)
    const { id, email: mail } = await this.prisma.user.create({
      data: { email, password: hashedPassword, role: 'USER' },
    })
  
    await this.sendEmailVerification(id, mail)
  
    return {
      message:
        'Compte créé. Un lien de confirmation a été envoyé à votre adresse e-mail.',
    }
  }
    

  async initiateLogin(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } })
    if (!user) {
      throw new HttpException('Identifiants invalides', HttpStatus.UNAUTHORIZED)
    }
  
    // ↪️ compte créé mais non confirmé
    if (!user.emailVerified) {
      throw new ForbiddenException('E-mail non vérifié')
    }
  
    await this.checkLockAndExpiration(user)
  
    const ok = await bcrypt.compare(password, user.password)
    if (!ok) {
      await this.recordFailedLogin(user)
      throw new HttpException('Identifiants invalides', HttpStatus.UNAUTHORIZED)
    }
    await this.resetFailedLogin(user)
  
    // — Pas d’OTP configuré → tokens directs
    if (!user.otpSecret) {
      const t = this.generateTokens(user.id, user.email, user.role)
      await this.storeHashedRefreshToken(user.id, t.refresh_token)
      return {
        access_token: t.access_token,
        refresh_token: t.refresh_token,
        user: { id: user.id, email: user.email, role: user.role },
      }
    }
  
    // — OTP requis
    const temp = this.jwtService.sign({ sub: user.id, email: user.email }, { expiresIn: '5m' })
    return { tempToken: temp, message: 'OTP requis' }
  }

  async verifyOtp(tempToken: string, otpCode: string) {
    try {
      const payload = this.jwtService.verify(tempToken);
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });
      if (!user) {
        throw new HttpException('Utilisateur non trouvé', HttpStatus.UNAUTHORIZED);
      }
      await this.checkLockAndExpiration(user);
      if (!user.otpSecret) {
        throw new HttpException(
          "L'OTP n'est pas configuré pour cet utilisateur",
          HttpStatus.UNAUTHORIZED,
        );
      }
      const isOtpValid = speakeasy.totp.verify({
        secret: user.otpSecret,
        encoding: 'base32',
        token: otpCode,
        window: 1,
      });
      if (!isOtpValid) {
        throw new HttpException('Code OTP invalide', HttpStatus.UNAUTHORIZED);
      }
      const tokens = this.generateTokens(user.id, user.email, user.role);
      await this.storeHashedRefreshToken(user.id, tokens.refresh_token);
      return {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        user: { id: user.id, email: user.email, role: user.role, otpSecret: user.otpSecret },
      };
    } catch {
      throw new HttpException(
        'Token temporaire invalide ou expiré',
        HttpStatus.UNAUTHORIZED,
      );
    }
  }

  async login(email: string, password: string, otpCode?: string) {
    const user = await this.prisma.user.findUnique({ where: { email } })
    if (!user) {
      throw new HttpException('Identifiants invalides', HttpStatus.UNAUTHORIZED)
    }
  
    // ↪️ blocage si e-mail non confirmé
    if (!user.emailVerified) {
      throw new ForbiddenException('E-mail non vérifié')
    }
  
    await this.checkLockAndExpiration(user)
  
    const ok = await bcrypt.compare(password, user.password)
    if (!ok) {
      await this.recordFailedLogin(user)
      throw new HttpException('Identifiants invalides', HttpStatus.UNAUTHORIZED)
    }
  
    if (user.otpSecret) {
      if (!otpCode) {
        await this.recordFailedLogin(user)
        throw new HttpException('Code OTP requis', HttpStatus.UNAUTHORIZED)
      }
      const valid = speakeasy.totp.verify({
        secret: user.otpSecret,
        encoding: 'base32',
        token: otpCode,
        window: 1,
      })
      if (!valid) {
        await this.recordFailedLogin(user)
        throw new HttpException('Code OTP invalide', HttpStatus.UNAUTHORIZED)
      }
    }
  
    await this.resetFailedLogin(user)
  
    const t = this.generateTokens(user.id, user.email, user.role)
    await this.storeHashedRefreshToken(user.id, t.refresh_token)
    return { access_token: t.access_token, refresh_token: t.refresh_token, user }
  }

  async refreshToken(token: string) {
    try {
      const payload = this.jwtService.verify(token);
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });
      if (!user || !user.refreshToken) {
        throw new HttpException('Refresh token invalide', HttpStatus.UNAUTHORIZED);
      }
      const isMatch = await bcrypt.compare(token, user.refreshToken);
      if (!isMatch) {
        await this.prisma.user.update({
          where: { id: user.id },
          data: { refreshToken: null },
        });
        throw new HttpException(
          'Refresh token révoqué ou déjà utilisé',
          HttpStatus.UNAUTHORIZED,
        );
      }
      const tokens = this.generateTokens(user.id, user.email, user.role);
      await this.storeHashedRefreshToken(user.id, tokens.refresh_token);
      return tokens;
    } catch {
      throw new HttpException(
        'Refresh token invalide ou expiré',
        HttpStatus.UNAUTHORIZED,
      );
    }
  }

  async logout(refreshToken: string) {
    if (!refreshToken) {
      return;
    }
    try {
      const payload = this.jwtService.verify(refreshToken);
      const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
      if (!user) {
        return;
      }
      if (user.refreshToken && (await bcrypt.compare(refreshToken, user.refreshToken))) {
        await this.prisma.user.update({
          where: { id: user.id },
          data: { refreshToken: null },
        });
      }
    } catch {}
  }

  async sendEmailVerification(userId: string, email: string) {
    const plain = randomToken()                 // jeton visible dans l’URL
    const hash  = await bcrypt.hash(plain, 10)  // version stockée
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)
  
    // un seul jeton actif → suppr anciens
    await this.prisma.emailVerification.deleteMany({ where: { userId } })
  
    await this.prisma.emailVerification.create({
      data: { token: hash, userId, expiresAt }
    })
  
    const link =
      `${process.env.FRONT_URL ?? 'http://localhost:5173'}` +
      `/verify-email?uid=${userId}&token=${plain}`
  
    const html = `
      <p>Bienvenue ! Veuillez confirmer votre adresse e-mail :</p>
      <p><a href="${link}">Confirmer mon e-mail</a></p>
      <p>Ce lien est valable 24 h.</p>
    `
    await this.mailService.sendMail(email, 'Confirmation de votre e-mail', html)
  }
  
  async confirmEmail(userId: string, plain: string) {
    const rec = await this.prisma.emailVerification.findFirst({
      where: { userId, expiresAt: { gt: new Date() } }
    })
    if (!rec) throw new BadRequestException('Lien invalide ou expiré')
  
    const ok = await bcrypt.compare(plain, rec.token)
    if (!ok) throw new BadRequestException('Lien invalide')
  
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: userId }, data: { emailVerified: true } }),
      this.prisma.emailVerification.delete({ where: { id: rec.id } })
    ])
    return { message: 'Adresse e-mail vérifiée !' }
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      return { message: "Si cet email est enregistré, un lien de réinitialisation vous a été envoyé." };
    }
    const tokenPlain = crypto.randomBytes(32).toString('hex');
    const tokenHashed = await bcrypt.hash(tokenPlain, 10);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    const passReset = await this.prisma.passwordReset.create({
      data: { token: tokenHashed, expiresAt, userId: user.id },
    });
    const resetId = passReset.id;
    const resetLink = `http://localhost:5173/reset-password?prid=${resetId}&token=${tokenPlain}`;
    const subject = 'Réinitialisation de votre mot de passe';
    const html = `
      <p>Pour réinitialiser votre mot de passe, cliquez sur le lien suivant :</p>
      <a href="${resetLink}">Réinitialiser mon mot de passe</a>
      <p>Ce lien est valable 10 minutes.</p>
    `;
    await this.mailService.sendMail(user.email, subject, html);
    return { message: "Si cet email est enregistré, un lien de réinitialisation vous a été envoyé." };
  }

  async resetPassword(prid: number, tokenPlain: string, newPassword: string) {
    const passwordReset = await this.prisma.passwordReset.findUnique({
      where: { id: prid },
      include: { user: true },
    });
    if (!passwordReset || passwordReset.expiresAt < new Date()) {
      throw new NotFoundException('Token invalide ou expiré');
    }
    const isMatch = await bcrypt.compare(tokenPlain, passwordReset.token);
    if (!isMatch) {
      throw new NotFoundException('Token invalide ou expiré');
    }
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id: passwordReset.userId },
      data: { password: hashedPassword },
    });
    await this.prisma.passwordReset.delete({ where: { id: prid } });
    return { message: 'Votre mot de passe a été réinitialisé avec succès' };
  }

  async enableOtp(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new HttpException('Utilisateur introuvable', HttpStatus.NOT_FOUND);
    }
    if (user.otpSecret) {
      throw new HttpException('OTP déjà activé pour cet utilisateur', HttpStatus.BAD_REQUEST);
    }
    const secret = speakeasy.generateSecret({ length: 20, name: 'MyApp', issuer: 'MyApp' });
    await this.prisma.user.update({ where: { id: userId }, data: { otpSecret: secret.base32 } });
    const otpauthUrl = secret.otpauth_url;
    if (!otpauthUrl) {
      throw new HttpException('Impossible de générer otpauth_url', HttpStatus.INTERNAL_SERVER_ERROR);
    }
    const qrCodeDataUrl = await qrcode.toDataURL(otpauthUrl);
    return { message: 'OTP activé avec succès', secret: secret.base32, qrCodeDataUrl };
  }

  async setUserOtpSecret(userId: string, otpSecret: string) {
    await this.prisma.user.update({ where: { id: userId }, data: { otpSecret } });
    return { message: 'OTP activé' };
  }

  async disableOtp(userId: string) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { otpSecret: null },
    });
    const { access_token, refresh_token } = this.generateTokens(
      user.id,
      user.email,
      user.role,
    );
    await this.storeHashedRefreshToken(user.id, refresh_token);
    return {
      access_token,
      refresh_token,
      message: 'OTP désactivé avec succès',
      user: { id: user.id, email: user.email, role: user.role },
    };
  }
}
