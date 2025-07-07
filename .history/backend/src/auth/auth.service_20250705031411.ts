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
import { ChildService } from '../child/child.service';
import { Role, Prisma } from '@prisma/client';
import {
  encrypt as encryptOtp,
  decrypt as decryptOtp,
} from '../utils/encryption';

const PASSWORD_EXPIRATION_DAYS = 60;
const MAX_FAILED_ATTEMPTS = 3;
const LOCK_DURATION_MS = 5 * 60 * 1000; // 5 min après la démo remettre a 1h

// Exiger la présence de clés JWT distinctes
const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET;
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET;
if (!ACCESS_TOKEN_SECRET || !REFRESH_TOKEN_SECRET) {
  throw new Error(
    'ACCESS_TOKEN_SECRET and REFRESH_TOKEN_SECRET env vars must be defined',
  );
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private mailService: MailService,
    private childService: ChildService,
  ) {}

  /* ──────────────────────────────────────── INSCRIPTION PARENT (classique) */
  async registerParent(dto: RegisterParentDto) {
    const {
      email,
      password,
      passwordConfirm,
      children = [],
      emergencyContacts = [],
      ...parentData // firstName, lastName, phone, address, legalResponsibility, …
    } = dto;

    /* 1) Vérifications basiques */
    if (await this.prisma.user.findUnique({ where: { email } })) {
      throw new BadRequestException('Email déjà utilisé');
    }
    if (password !== passwordConfirm) {
      throw new BadRequestException('Les mots de passe ne correspondent pas.');
    }

    const hash = await bcrypt.hash(password, 10);

    /* 2) Création du User + ParentProfile (sans enfants) */
    const parent = await this.prisma.user.create({
      data: {
        email,
        password: hash,
        role: Role.PARENT,
        emailVerified: true, // plus besoin de confirmation par mail
        parentProfile: {
          create: {
            ...parentData,
            emergencyContacts: {
              create: (
                emergencyContacts as Prisma.EmergencyContactCreateWithoutParentInput[]
              ).map((c) => ({
                name: c.name,
                phone: c.phone,
                relation: c.relation,
              })),
            },
          },
        },
      },
      include: { parentProfile: true },
    });

    /* 3) Créer chaque enfant via ChildService (qui enverra ses mails) */
    const parentProfileId = parent.parentProfile!.id;
    for (const ch of children) {
      await this.childService.createForParent(parentProfileId, {
        firstName: ch.firstName,
        lastName: ch.lastName,
        birthDate: ch.birthDate,
      });
    }

    return {
      message:
        'Compte parent (et comptes enfants) créé et actif immédiatement.',
    };
  }

  /* ──────────────────────────────────────────────────────────────── LOGIN HELPERS */
  private async checkLockAndExpiration(user: any) {
    const now = new Date();
    if (user.lockUntil && user.lockUntil > now) {
      throw new HttpException(`Compte bloqué momentanément`, HttpStatus.LOCKED);
    }

    // Règle d'expiration (sauf pour les comptes CHILD)
    if (user.role !== 'CHILD') {
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
    const hashed = await bcrypt.hash(token, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: hashed },
    });
  }

  generateTokens(userId: string, email: string, role: string) {
    const payload = { sub: userId, email, role };
    return {
      access_token: this.jwtService.sign(payload, {
        secret: ACCESS_TOKEN_SECRET,
        expiresIn: '1h',
      }),
      refresh_token: this.jwtService.sign(payload, {
        secret: REFRESH_TOKEN_SECRET,
        expiresIn: '2d', // rotation forcée plus fréquente
      }),
    };
  }

  /* ──────────────────────────────────────────────────────────────── LOGIN / OTP */
  async initiateLogin(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new HttpException(
        'Identifiants invalides',
        HttpStatus.UNAUTHORIZED,
      );
    }

    await this.checkLockAndExpiration(user);

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      await this.recordFailedLogin(user);
      throw new HttpException(
        'Identifiants invalides',
        HttpStatus.UNAUTHORIZED,
      );
    }
    await this.resetFailedLogin(user);

    /* OTP non activé → on renvoie directement tokens */
    if (!user.otpSecret) {
      const t = this.generateTokens(user.id, user.email, user.role);
      await this.storeHashedRefreshToken(user.id, t.refresh_token);
      return {
        access_token: t.access_token,
        refresh_token: t.refresh_token,
        user: this._publicUser(user),
      };
    }

    /* OTP activé → on renvoie un token temporaire */
    const temp = this.jwtService.sign(
      { sub: user.id, email: user.email },
      { secret: ACCESS_TOKEN_SECRET, expiresIn: '5m' },
    );
    return { tempToken: temp, message: 'OTP requis' };
  }

  async login(email: string, password: string, otpCode?: string) {
    // Si OTP configuré, on va d'abord générer un tempToken via initiateLogin
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new HttpException(
        'Identifiants invalides',
        HttpStatus.UNAUTHORIZED,
      );
    }

    await this.checkLockAndExpiration(user);
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      await this.recordFailedLogin(user);
      throw new HttpException(
        'Identifiants invalides',
        HttpStatus.UNAUTHORIZED,
      );
    }

    if (user.otpSecret) {
      const otpPlain = decryptOtp(user.otpSecret);
      if (!otpCode) {
        // renvoyer tempToken si pas de code OTP fourni
        const temp = this.jwtService.sign(
          { sub: user.id, email: user.email },
          { secret: ACCESS_TOKEN_SECRET, expiresIn: '5m' },
        );
        return { tempToken: temp, message: 'OTP requis' };
      }
      // on vérifie le code OTP
      const isOtpValid = speakeasy.totp.verify({
        secret: otpPlain,
        encoding: 'base32',
        token: otpCode,
        window: 1,
      });
      if (!isOtpValid) {
        await this.recordFailedLogin(user);
        throw new HttpException('Code OTP invalide', HttpStatus.UNAUTHORIZED);
      }
    }

    await this.resetFailedLogin(user);
    const tokens = this.generateTokens(user.id, user.email, user.role);
    await this.storeHashedRefreshToken(user.id, tokens.refresh_token);
    return {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      user: this._publicUser(user),
    };
  }

  async verifyOtp(tempToken: string, otpCode: string) {
    try {
      const payload = this.jwtService.verify(tempToken, {
        secret: ACCESS_TOKEN_SECRET,
      });
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });
      if (!user) {
        throw new HttpException(
          'Utilisateur non trouvé',
          HttpStatus.UNAUTHORIZED,
        );
      }
      await this.checkLockAndExpiration(user);

      const otpPlain = decryptOtp(user.otpSecret!);
      const isOtpValid = speakeasy.totp.verify({
        secret: otpPlain,
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
        user: this._publicUser(user),
      };
    } catch {
      throw new HttpException(
        'Token temporaire invalide ou expiré',
        HttpStatus.UNAUTHORIZED,
      );
    }
  }

  /* ─────────────────────────────────────────── CONFIRMATION EMAIL */
  async confirmEmail(userId: string, plain: string) {
    const rec = await this.prisma.emailVerification.findFirst({
      where: { userId, expiresAt: { gt: new Date() } },
      include: {
        user: {
          include: {
            parentProfile: {
              include: { children: true },
            },
          },
        },
      },
    });
    if (!rec) {
      throw new BadRequestException('Lien invalide ou expiré.');
    }

    const isMatch = await bcrypt.compare(plain, rec.token);
    if (!isMatch) {
      throw new BadRequestException('Lien invalide ou expiré.');
    }

    const parent = rec.user;
    const profile = parent.parentProfile;
    if (!profile) {
      throw new BadRequestException('ParentProfile introuvable.');
    }
    if (parent.emailVerified) {
      throw new BadRequestException('E-mail déjà vérifié.');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: parent.id },
        data: { emailVerified: true },
      });

      for (const cp of profile.children) {
        const existing = await tx.user.findFirst({
          where: { childProfile: { id: cp.id } },
        });
        if (existing) continue;

        // Génération d'un login unique sous la forme « fbarbe@kids.local »
        const base = `${cp.firstName[0].toLowerCase()}${cp.lastName.toLowerCase()}`;
        let login = base;
        let suffix = 1;
        while (
          await tx.user.findUnique({ where: { email: `${login}@kids.local` } })
        ) {
          login = `${base}_${suffix++}`;
        }

        // Mot de passe aléatoire 16 caractères hex (>=12)
        const plainPwd = crypto.randomBytes(8).toString('hex');
        const hashed = await bcrypt.hash(plainPwd, 10);

        await tx.user.create({
          data: {
            email: `${login}@kids.local`,
            password: hashed,
            role: Role.CHILD,
            emailVerified: true,
            childProfile: { connect: { id: cp.id } },
          },
        });

        // Envoi des identifiants au parent
        await this.mailService.sendChildCredentials(parent.email, {
          childName: `${cp.firstName} ${cp.lastName}`,
          login,
          password: plainPwd,
        });
      }

      await tx.emailVerification.delete({ where: { id: rec.id } });
      return { message: 'E-mail vérifié et comptes enfants créés.' };
    });
  }

  /* ─────────────────────────────────────────── REFRESH / LOGOUT */
  async refreshToken(token: string) {
    try {
      const payload = this.jwtService.verify(token, {
        secret: REFRESH_TOKEN_SECRET,
      });
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });
      if (!user || !user.refreshToken) {
        throw new HttpException(
          'Refresh token invalide',
          HttpStatus.UNAUTHORIZED,
        );
      }
      const isMatch = await bcrypt.compare(token, user.refreshToken);
      if (!isMatch) {
        await this.prisma.user.update({
          where: { id: user.id },
          data: { refreshToken: null },
        });
        throw new HttpException(
          'Refresh token révoqué',
          HttpStatus.UNAUTHORIZED,
        );
      }

      // Invalide si le mot de passe a été changé APRÈS l'émission du refresh-token
      if (
        user.passwordChangedAt &&
        payload.iat * 1000 < new Date(user.passwordChangedAt).getTime()
      ) {
        await this.prisma.user.update({
          where: { id: user.id },
          data: { refreshToken: null },
        });
        throw new HttpException(
          'Refresh token périmé (mot de passe modifié)',
          HttpStatus.UNAUTHORIZED,
        );
      }

      const tokens = this.generateTokens(user.id, user.email, user.role);
      await this.storeHashedRefreshToken(user.id, tokens.refresh_token);
      return tokens;
    } catch {
      throw new HttpException(
        'Refresh token invalide',
        HttpStatus.UNAUTHORIZED,
      );
    }
  }

  async logout(refreshToken: string) {
    if (!refreshToken) return;
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: REFRESH_TOKEN_SECRET,
      });
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });
      if (
        user?.refreshToken &&
        (await bcrypt.compare(refreshToken, user.refreshToken))
      ) {
        await this.prisma.user.update({
          where: { id: user.id },
          data: { refreshToken: null },
        });
      }
    } catch {}
  }

  /* ───────────────────────────────────────── OTP (enable / disable) */
  async enableOtp(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user)
      throw new HttpException('Utilisateur introuvable', HttpStatus.NOT_FOUND);
    if (user.otpSecret) {
      throw new HttpException('OTP déjà activé', HttpStatus.BAD_REQUEST);
    }

    const secret = speakeasy.generateSecret({
      length: 20,
      name: 'MyApp',
      issuer: 'MyApp',
    });
    await this.prisma.user.update({
      where: { id: userId },
      data: { otpSecret: encryptOtp(secret.base32) },
    });

    const qrCodeDataUrl = await qrcode.toDataURL(secret.otpauth_url);
    return { secret: secret.base32, qrCodeDataUrl };
  }

  async setUserOtpSecret(userId: string, otpSecret: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { otpSecret: encryptOtp(otpSecret) },
    });
    return { message: 'OTP activé' };
  }

  async disableOtp(userId: string) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { otpSecret: null },
    });
    const tokens = this.generateTokens(user.id, user.email, user.role);
    await this.storeHashedRefreshToken(user.id, tokens.refresh_token);
    return {
      ...tokens,
      user: this._publicUser(user),
      message: 'OTP désactivé',
    };
  }

  /* ─────────────────────────────────────────── Register par INVITATION  */
  async registerWithRole(dto: RegisterByInviteDto, forcedRole: Role) {
    const {
      token,
      email,
      password,
      passwordConfirm,
      children = [],
      emergencyContacts = [],
      ...parentData // firstName, lastName, phone, address, legalResponsibility…
    } = dto;

    if (password !== passwordConfirm) {
      throw new BadRequestException('Les mots de passe ne correspondent pas.');
    }
    if (await this.prisma.user.findUnique({ where: { email } })) {
      throw new BadRequestException('Cet e-mail est déjà utilisé.');
    }

    /* 1) Préparer children pour ChildService */
    const childCreates = (
      children as {
        firstName?: string;
        lastName?: string;
        birthDate: string;
      }[]
    )
      .filter((c) => c.firstName && c.lastName && c.birthDate)
      .map((c) => ({
        firstName: c.firstName!.trim(),
        lastName: c.lastName!.trim(),
        birthDate: c.birthDate,
      }));

    /* 2) Préparer emergencyContacts pour Prisma */
    type RawContact = {
      firstName?: string;
      lastName?: string;
      phone?: string;
      relation?: string;
      relationOther?: string;
    };
    const raws: RawContact[] = Array.isArray(emergencyContacts)
      ? (emergencyContacts as RawContact[])
      : [];

    const contactCreates: Prisma.EmergencyContactCreateWithoutParentInput[] =
      raws
        .filter((c) => c.firstName || c.lastName || c.phone)
        .map((c) => ({
          name: `${(c.firstName ?? '').trim()} ${(c.lastName ?? '').trim()}`.trim(),
          phone: (c.phone ?? '').trim() || 'ND',
          relation:
            c.relation === 'Autre' && c.relationOther
              ? `Autre: ${c.relationOther.trim()}`
              : (c.relation ?? 'Autre'),
        }));

    const passwordHash = await bcrypt.hash(password, 10);

    if (forcedRole === Role.PARENT) {
      /* 3) Création user + ParentProfile sans enfants */
      const parent = await this.prisma.user.create({
        data: {
          email,
          password: passwordHash,
          role: Role.PARENT,
          emailVerified: true,
          parentProfile: {
            create: {
              ...parentData,
              ...(contactCreates.length && {
                emergencyContacts: { create: contactCreates },
              }),
            },
          },
        },
        include: { parentProfile: true },
      });

      /* 4) Créer enfants via ChildService */
      const parentProfileId = parent.parentProfile!.id;
      for (const ch of childCreates) {
        await this.childService.createForParent(parentProfileId, {
          firstName: ch.firstName,
          lastName: ch.lastName,
          birthDate: ch.birthDate,
        });
      }

      return parent;
    }

    /* Autre rôle (STAFF, DIRECTOR, ...) */
    return this.prisma.user.create({
      data: {
        email,
        password: passwordHash,
        role: forcedRole,
        emailVerified: true,
      },
    });
  }

  /* ─────────────────────────────────────────── MOT DE PASSE OUBLIE  */
  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      return { message: "Si l'adresse existe, un lien vient d'être envoyé." };
    }

    const tokenPlain = crypto.randomBytes(32).toString('hex');
    const tokenHashed = await bcrypt.hash(tokenPlain, 10);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min

    const passReset = await this.prisma.passwordReset.create({
      data: { token: tokenHashed, expiresAt, userId: user.id },
    });

    const resetLink = `http://localhost:5173/reset-password?prid=${passReset.id}&token=${tokenPlain}`;
    const html = `
      <p>Cliquez pour réinitialiser votre mot de passe :</p>
      <a href="${resetLink}">Réinitialiser</a>
      <p>Valable 10 minutes.</p>
    `;
    await this.mailService.sendMail(
      user.email,
      'Réinitialisation de mot de passe',
      html,
    );
    return { message: "Si l'adresse existe, un lien vient d'être envoyé." };
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
      data: {
        password: hashedPassword,
        passwordChangedAt: new Date(),
        refreshToken: null,
      },
    });
    await this.prisma.passwordReset.delete({ where: { id: prid } });

    return { message: 'Mot de passe réinitialisé.' };
  }

  /* ─────────────────────────── CHANGE PASSWORD (utilisateur connecté) */
  async changePassword(userId: string, currentPwd: string, newPwd: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Utilisateur introuvable');

    const ok = await bcrypt.compare(currentPwd, user.password);
    if (!ok) throw new ForbiddenException('Mot de passe actuel incorrect');

    // Si même mot de passe → refuse
    const same = await bcrypt.compare(newPwd, user.password);
    if (same)
      throw new BadRequestException(
        'Le nouveau mot de passe doit être différent',
      );

    const hash = await bcrypt.hash(newPwd, 10);
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hash,
        passwordChangedAt: new Date(),
        failedLoginAttempts: 0,
        lockUntil: null,
        forcePasswordReset: false,
        refreshToken: null,
      },
    });

    return { message: 'Mot de passe mis à jour' };
  }

  /** Projection publique d'un utilisateur vers le front */
  private _publicUser(u: any) {
    return {
      id: u.id,
      email: u.email,
      role: u.role,
      otpEnabled: !!u.otpSecret,
      otpSecret: u.otpSecret ? '***' : null,
    };
  }

  /** Masque partiellement un numéro de téléphone pour la sécurité */
  private maskPhoneNumber(phone: string | null): string | null {
    if (!phone) return null;
    // Supprimer tous les espaces et caractères non numériques
    const cleanPhone = phone.replace(/\D/g, '');
    // Pour les numéros français (10 chiffres), masquer le milieu
    if (cleanPhone.length === 10) {
      return `${cleanPhone.slice(0, 2)} ${cleanPhone.slice(2, 4)} ** ** ${cleanPhone.slice(8, 10)}`;
    }
    // Pour d'autres formats, masquer la partie centrale
    if (cleanPhone.length >= 6) {
      const start = cleanPhone.slice(0, 2);
      const end = cleanPhone.slice(-2);
      return `${start}****${end}`;
    }
    // Si le numéro est trop court, le masquer complètement
    return '****';
  }

  /** Récupère le profil complet de l'utilisateur avec ses informations spécifiques au rôle */
  async getUserProfile(userId: string) {
    if (!userId) {
      throw new BadRequestException('ID utilisateur manquant');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        parentProfile: {
          include: {
            children: true,
            emergencyContacts: true,
          },
        },
        staffProfile: true,
        secretaryProfile: true,
        directorProfile: true,
        serviceManagerProfile: true,
        childProfile: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur introuvable');
    }

    // Base info
    const baseProfile = {
      id: user.id,
      email: user.email,
      role: user.role,
      otpEnabled: !!user.otpSecret,
      createdAt: user.createdAt,
    };

    // Add profile-specific info based on role
    let profileInfo = {};

    switch (user.role) {
      case 'PARENT':
        if (user.parentProfile) {
          profileInfo = {
            parentProfileId: user.parentProfile.id, // Ajouter l'ID du profil parent
            firstName: user.parentProfile.firstName,
            lastName: user.parentProfile.lastName,
            phone: user.parentProfile.phone,
            address: 'Renseignée',
            legalResponsibility: user.parentProfile.legalResponsibility,
            children: user.parentProfile.children.map((child) => ({
              id: child.id,
              firstName: child.firstName,
              lastName: child.lastName,
              birthDate: child.birthDate.toISOString(),
              parentProfileId: child.parentProfileId,
              imageConsent: child.imageConsent || false,
            })),
            emergencyContacts: user.parentProfile.emergencyContacts.map(
              (contact) => ({
                id: contact.id,
                name: contact.name,
                relation: contact.relation,
                phone: contact.phone,
              }),
            ),
          };
        }
        break;

      case 'STAFF':
        if (user.staffProfile) {
          profileInfo = {
            firstName: user.staffProfile.firstName,
            lastName: user.staffProfile.lastName,
            phone: user.staffProfile.phone,
            birthDate: user.staffProfile.birthDate
              ? user.staffProfile.birthDate.getFullYear()
              : null,
            discipline: user.staffProfile.discipline,
            specialty: user.staffProfile.specialty,
          };
        }
        break;

      case 'SECRETARY':
        if (user.secretaryProfile) {
          profileInfo = {
            firstName: user.secretaryProfile.firstName,
            lastName: user.secretaryProfile.lastName,
            phone: user.secretaryProfile.phone,
            birthDate: user.secretaryProfile.birthDate
              ? user.secretaryProfile.birthDate.getFullYear()
              : null,
            specialty: user.secretaryProfile.specialty,
            startDate: user.secretaryProfile.startDate,
            profileImage: user.secretaryProfile.profileImage,
          };
        }
        break;

      case 'DIRECTOR':
        if (user.directorProfile) {
          profileInfo = {
            firstName: user.directorProfile.firstName,
            lastName: user.directorProfile.lastName,
            phone: user.directorProfile.phone,
            birthDate: user.directorProfile.birthDate
              ? user.directorProfile.birthDate.getFullYear()
              : null,
            jobTitle: user.directorProfile.jobTitle,
            startDate: user.directorProfile.startDate,
            profileImage: user.directorProfile.profileImage,
            specialty: user.directorProfile.specialty,
          };
        }
        break;

      case 'SERVICE_MANAGER':
        if (user.serviceManagerProfile) {
          profileInfo = {
            firstName: user.serviceManagerProfile.firstName,
            lastName: user.serviceManagerProfile.lastName,
            phone: user.serviceManagerProfile.phone,
            birthDate: user.serviceManagerProfile.birthDate
              ? user.serviceManagerProfile.birthDate.getFullYear()
              : null,
            jobTitle: user.serviceManagerProfile.jobTitle,
            startDate: user.serviceManagerProfile.startDate,
            profileImage: user.serviceManagerProfile.profileImage,
            specialty: user.serviceManagerProfile.specialty,
          };
        }
        break;

      case 'CHILD':
        if (user.childProfile) {
          profileInfo = {
            firstName: user.childProfile.firstName,
            lastName: user.childProfile.lastName,
            birthDate: user.childProfile.birthDate
              ? user.childProfile.birthDate.getFullYear()
              : null,
          };
        }
        break;
    }

    return {
      ...baseProfile,
      ...profileInfo,
    };
  }

  /** Récupère les données du profil pour l'édition (non masquées) */
  async getProfileForEdit(userId: string) {
    if (!userId) {
      throw new BadRequestException('ID utilisateur manquant');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        parentProfile: true,
        staffProfile: true,
        secretaryProfile: true,
        directorProfile: true,
        serviceManagerProfile: true,
        childProfile: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur introuvable');
    }

    // Retourner les données non masquées pour l'édition
    let editData = {
      firstName: '',
      lastName: '',
      phone: '',
    };

    switch (user.role) {
      case 'PARENT':
        if (user.parentProfile) {
          editData = {
            firstName: user.parentProfile.firstName,
            lastName: user.parentProfile.lastName,
            phone: user.parentProfile.phone || '',
          };
        }
        break;

      case 'STAFF':
        if (user.staffProfile) {
          editData = {
            firstName: user.staffProfile.firstName,
            lastName: user.staffProfile.lastName,
            phone: user.staffProfile.phone || '',
          };
        }
        break;

      case 'SECRETARY':
        if (user.secretaryProfile) {
          editData = {
            firstName: user.secretaryProfile.firstName,
            lastName: user.secretaryProfile.lastName,
            phone: user.secretaryProfile.phone || '',
          };
        }
        break;

      case 'DIRECTOR':
        if (user.directorProfile) {
          editData = {
            firstName: user.directorProfile.firstName,
            lastName: user.directorProfile.lastName,
            phone: user.directorProfile.phone || '',
          };
        }
        break;

      case 'SERVICE_MANAGER':
        if (user.serviceManagerProfile) {
          editData = {
            firstName: user.serviceManagerProfile.firstName,
            lastName: user.serviceManagerProfile.lastName,
            phone: user.serviceManagerProfile.phone || '',
          };
        }
        break;

      case 'CHILD':
        if (user.childProfile) {
          editData = {
            firstName: user.childProfile.firstName,
            lastName: user.childProfile.lastName,
            phone: '', // Les enfants n'ont pas de téléphone
          };
        }
        break;
    }

    return editData;
  }

  /** Met à jour le profil utilisateur selon son rôle */
  async updateProfile(
    userId: string,
    updateData: { firstName?: string; lastName?: string; phone?: string },
  ) {
    if (!userId) {
      throw new BadRequestException('ID utilisateur manquant');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        parentProfile: true,
        staffProfile: true,
        secretaryProfile: true,
        directorProfile: true,
        serviceManagerProfile: true,
        childProfile: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur introuvable');
    }

    // Filtrer et valider les données d'entrée pour éviter l'injection de champs
    const sanitizedData: { firstName?: string; lastName?: string; phone?: string } = {};
    if (updateData.firstName !== undefined && updateData.firstName.trim()) {
      sanitizedData.firstName = updateData.firstName.trim();
    }
    if (updateData.lastName !== undefined && updateData.lastName.trim()) {
      sanitizedData.lastName = updateData.lastName.trim();
    }
    if (updateData.phone !== undefined && updateData.phone.trim()) {
      sanitizedData.phone = updateData.phone.trim();
    }

    // Mettre à jour selon le rôle
    switch (user.role) {
      case 'PARENT':
        if (user.parentProfile) {
          await this.prisma.parentProfile.update({
            where: { id: user.parentProfile.id },
            data: sanitizedData,
          });
        }
        break;

      case 'STAFF':
        if (user.staffProfile) {
          await this.prisma.staffProfile.update({
            where: { id: user.staffProfile.id },
            data: {
              ...(updateData.firstName && { firstName: updateData.firstName }),
              ...(updateData.lastName && { lastName: updateData.lastName }),
              ...(updateData.phone && { phone: updateData.phone }),
            },
          });
        }
        break;

      case 'SECRETARY':
        if (user.secretaryProfile) {
          await this.prisma.secretaryProfile.update({
            where: { id: user.secretaryProfile.id },
            data: {
              ...(updateData.firstName && { firstName: updateData.firstName }),
              ...(updateData.lastName && { lastName: updateData.lastName }),
              ...(updateData.phone && { phone: updateData.phone }),
            },
          });
        }
        break;

      case 'DIRECTOR':
        if (user.directorProfile) {
          await this.prisma.directorProfile.update({
            where: { id: user.directorProfile.id },
            data: {
              ...(updateData.firstName && { firstName: updateData.firstName }),
              ...(updateData.lastName && { lastName: updateData.lastName }),
              ...(updateData.phone && { phone: updateData.phone }),
            },
          });
        }
        break;

      case 'SERVICE_MANAGER':
        if (user.serviceManagerProfile) {
          await this.prisma.serviceManagerProfile.update({
            where: { id: user.serviceManagerProfile.id },
            data: {
              ...(updateData.firstName && { firstName: updateData.firstName }),
              ...(updateData.lastName && { lastName: updateData.lastName }),
              ...(updateData.phone && { phone: updateData.phone }),
            },
          });
        }
        break;

      case 'CHILD':
        if (user.childProfile) {
          await this.prisma.child.update({
            where: { id: user.childProfile.id },
            data: {
              ...(updateData.firstName && { firstName: updateData.firstName }),
              ...(updateData.lastName && { lastName: updateData.lastName }),
            },
          });
        }
        break;

      default:
        throw new BadRequestException(
          'Type de profil non supporté pour la mise à jour',
        );
    }

    return { message: 'Profil mis à jour avec succès' };
  }

  /* ─────────────────────────────────────────── TOKEN VALIDATION */
  async validateTokenExpiration(userId: string, tokenIssuedAt: number): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { passwordChangedAt: true, refreshToken: true }
    });

    if (!user) {
      return false;
    }

    // Vérifier si le token a été émis après le dernier changement de mot de passe
    if (user.passwordChangedAt) {
      const passwordChangedTime = new Date(user.passwordChangedAt).getTime();
      const tokenTime = tokenIssuedAt * 1000;
      
      if (tokenTime < passwordChangedTime) {
        // Token émis avant le changement de mot de passe -> invalide
        await this.prisma.user.update({
          where: { id: userId },
          data: { refreshToken: null }
        });
        return false;
      }
    }

    return true;
  }

  /* ─────────────────────────────────────────── SECURITY HELPERS */
  private async logSecurityEvent(
    userId: string, 
    event: string, 
    details: any = {}, 
    ipAddress?: string
  ) {
    // Log les événements de sécurité pour audit
    console.log(`[SECURITY] ${event}`, {
      userId,
      timestamp: new Date().toISOString(),
      ipAddress,
      ...details
    });
    
    // TODO: Stocker en base dans une table d'audit si nécessaire
  }

  private isPasswordExpired(passwordChangedAt: Date): boolean {
    const expirationDate = new Date(
      passwordChangedAt.getTime() + PASSWORD_EXPIRATION_DAYS * 24 * 60 * 60 * 1000
    );
    return expirationDate < new Date();
  }

  /* ─────────────────────────────────────────── REFRESH TOKEN IMPROVEMENTS */
}
