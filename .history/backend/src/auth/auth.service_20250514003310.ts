import {
  Injectable,
  HttpException,
  HttpStatus,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import * as speakeasy from 'speakeasy';
import * as qrcode from 'qrcode';  // Ajout de l'import pour générer le QR code
import { MailService } from '../mail/mail.service';

const PASSWORD_EXPIRATION_DAYS = 60;
const MAX_FAILED_ATTEMPTS   = 5;
const LOCK_DURATION_MS      = 60 * 60 * 1000; // 1 heure


/**
 * (Optionnel) Tu peux définir une interface pour le payload du JWT,
 * afin de typer "payload.sub, payload.email, payload.role, etc."
 *
 * interface JwtPayload {
 *   sub: string;    // l'id utilisateur
 *   email: string;
 *   role: string;
 *   iat?: number;
 *   exp?: number;
 * }
 */

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private mailService: MailService,
  ) {}

  /**
 * Vérifie si le compte est bloqué ou si le mot de passe a expiré.
 */
private async checkLockAndExpiration(user: any) {
  const now = new Date();

  if (user.lockUntil && user.lockUntil > now) {
    throw new HttpException(
      `Compte bloqué jusqu'à ${user.lockUntil.toISOString()}`,
      HttpStatus.LOCKED,
    );
  }

  const expirationDate = new Date(
    user.passwordChangedAt.getTime()
    + PASSWORD_EXPIRATION_DAYS * 24 * 60 * 60 * 1000
  );
  if (user.forcePasswordReset || expirationDate < now) {
    throw new ForbiddenException(
      'Votre mot de passe a expiré, veuillez le réinitialiser'
    );
  }
}

/**
 * Incrémente failedLoginAttempts et verrouille si nécessaire.
 */
private async recordFailedLogin(user: any) {
  let failed    = user.failedLoginAttempts + 1;
  let lockUntil = user.lockUntil;

  if (failed >= MAX_FAILED_ATTEMPTS) {
    lockUntil = new Date(Date.now() + LOCK_DURATION_MS);
    failed    = 0;
  }

  await this.prisma.user.update({
    where: { id: user.id },
    data: { failedLoginAttempts: failed, lockUntil },
  });
}

/**
 * Réinitialise le compteur d’échecs après un login réussi.
 */
private async resetFailedLogin(user: any) {
  await this.prisma.user.update({
    where: { id: user.id },
    data: { failedLoginAttempts: 0, lockUntil: null },
  });
}


  /**
   * Génère un access_token et un refresh_token où 'sub' = userId.
   */
  generateTokens(userId: string, email: string, role: string) {
    // On stocke l'ID dans sub, conforme aux standards JWT
    const payload = { sub: userId, email, role };
    const access_token = this.jwtService.sign(payload, { expiresIn: '1h' });
    const refresh_token = this.jwtService.sign(payload, { expiresIn: '7d' });
    return { access_token, refresh_token };
  }

  /**
   * Inscription d'un utilisateur (OTP inactif par défaut).
   */
  async register(email: string, password: string) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      throw new HttpException(
        'Utilisateur déjà existant',
        HttpStatus.BAD_REQUEST,
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await this.prisma.user.create({
      data: { email, password: hashedPassword, role: 'USER',passwordChangedAt: new Date(), 
        forcePasswordReset: false },
    });

    // Génération des tokens
    const tokens = this.generateTokens(user.id, user.email, user.role);

    // Enregistrement du refreshToken en BDD
    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: tokens.refresh_token },
    });

    return {
      ...tokens,
      user: { id: user.id, email: user.email, role: user.role },
    };
  }

  /**
   * Étape 1 du login "en deux temps":
   * - Si l'OTP n'est pas activé => on renvoie directement les tokens finaux.
   * - Si l'OTP est activé => on renvoie un token temporaire (tempToken).
   */
  async initiateLogin(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new HttpException('Identifiants invalides', HttpStatus.UNAUTHORIZED);
    }
    
    // 1) Vérifie verrou + expiration
    await this.checkLockAndExpiration(user);
    
    // 2) Compare le mot de passe
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      // 3) Incrémente le compteur sur échec
      await this.recordFailedLogin(user);
      throw new HttpException('Identifiants invalides', HttpStatus.UNAUTHORIZED);
    }
    
    // 4) Réinitialise le compteur sur succès
    await this.resetFailedLogin(user);
    

    // OTP non activé => renvoie directement le JWT
    if (!user.otpSecret) {
      const tokens = this.generateTokens(user.id, user.email, user.role);
      await this.prisma.user.update({
        where: { id: user.id },
        data: { refreshToken: tokens.refresh_token },
      });
      return {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,  
        user: { id: user.id, email: user.email, role: user.role, otpSecret: user.otpSecret },
      };
    }

    // OTP activé => on renvoie un tempToken (sur 5 minutes)
    const tempToken = this.jwtService.sign(
      { sub: user.id, email: user.email },
      { expiresIn: '5m' },
    );
    return { tempToken, message: 'OTP requis' };
  }

  /**
   * Étape 2 du login "en deux temps":
   * - Vérifie le tempToken (décodage).
   * - Vérifie le code OTP via speakeasy.
   * - Renvoie les tokens finaux si validé.
   */
  async verifyOtp(tempToken: string, otpCode: string) {
    try {
      // payload contient sub (id), email, iat, exp, ...
      const payload = this.jwtService.verify(tempToken);
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });
      if (!user) {
        throw new HttpException(
          'Utilisateur non trouvé',
          HttpStatus.UNAUTHORIZED,
        );
      }
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

      // OTP valide => Génération des tokens finaux
      const tokens = this.generateTokens(user.id, user.email, user.role);
      await this.prisma.user.update({
        where: { id: user.id },
        data: { refreshToken: tokens.refresh_token },
      });

      return {
        ...tokens,
        user: { id: user.id, email: user.email, role: user.role, otpSecret: user.otpSecret },
      };
    } catch (err) {
      throw new HttpException(
        'Token temporaire invalide ou expiré',
        HttpStatus.UNAUTHORIZED,
      );
    }
  }

  /**
   * Login "classique" en un seul appel:
   * - Si l'OTP est activé, on attend un otpCode.
   * - Sinon, connexion directe.
   */
  async login(email: string, password: string, otpCode?: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new HttpException('Identifiants invalides', HttpStatus.UNAUTHORIZED);
    }
    
    // 1) Vérifie verrouillage et expiration du mot de passe
    await this.checkLockAndExpiration(user);
    
    // 2) Compare le mot de passe
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      await this.recordFailedLogin(user);
      throw new HttpException('Identifiants invalides', HttpStatus.UNAUTHORIZED);
    }
    
    // 3) Si OTP activé, vérifie le code
    if (user.otpSecret) {
      if (!otpCode) {
        await this.recordFailedLogin(user);
        throw new HttpException('Code OTP requis', HttpStatus.UNAUTHORIZED);
      }
      const isOtpValid = speakeasy.totp.verify({ /* … */ });
      if (!isOtpValid) {
        await this.recordFailedLogin(user);
        throw new HttpException('Code OTP invalide', HttpStatus.UNAUTHORIZED);
      }
    }
    
    // 4) Réinitialise le compteur sur succès
    await this.resetFailedLogin(user);
    
    // Enfin, génère et renvoie les tokens
    const tokens = this.generateTokens(user.id, user.email, user.role);
    /* … */
    

    // Si l'OTP est activé, le code doit être fourni + vérifié
    if (user.otpSecret) {
      if (!otpCode) {
        throw new HttpException('Code OTP requis', HttpStatus.UNAUTHORIZED);
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
    }

    // Génération des tokens
    const tokens = this.generateTokens(user.id, user.email, user.role);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: tokens.refresh_token },
    });

    return {
      ...tokens,
      user: { id: user.id, email: user.email, role: user.role, otpSecret: user.otpSecret },
    };
  }

  /**
   * Refresh d'un token expiré (basé sur le refreshToken).
   */
  async refreshToken(token: string) {
    try {
      // payload = { sub, email, role, iat, exp }
      const payload = this.jwtService.verify(token);
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });
      if (!user || user.refreshToken !== token) {
        throw new HttpException('Refresh token invalide', HttpStatus.UNAUTHORIZED);
      }

      // On régénère un nouveau pair (access, refresh)
      const tokens = this.generateTokens(user.id, user.email, user.role);
      await this.prisma.user.update({
        where: { id: user.id },
        data: { refreshToken: tokens.refresh_token },
      });
      return tokens;
    } catch (err) {
      throw new HttpException(
        'Refresh token invalide ou expiré',
        HttpStatus.UNAUTHORIZED,
      );
    }
  }

  /**
   * Déconnexion : supprime le refreshToken en base si c'est le bon.
   */
  async logout(refreshToken: string) {
    if (!refreshToken) {
      return;
    }
    try {
      const payload = this.jwtService.verify(refreshToken);
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });
      if (!user) {
        return;
      }
      if (user.refreshToken === refreshToken) {
        await this.prisma.user.update({
          where: { id: user.id },
          data: { refreshToken: null },
        });
      }
    } catch (err) {
      // Token invalide => on ignore
    }
  }

  /**
   * Envoi d'un mail de réinitialisation si l'email est trouvé,
   * sinon on "prétend" le faire (ne pas dévoiler l'existence du compte).
   */
  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    // On ne révèle pas si l'utilisateur n'existe pas
    if (!user) {
      return {
        message:
          "Si cet email est enregistré, un lien de réinitialisation vous a été envoyé.",
      };
    }

    // Génération d'un token "plaintext" + hachage
    const tokenPlain = crypto.randomBytes(32).toString('hex');
    const tokenHashed = await bcrypt.hash(tokenPlain, 10);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // Sauvegarde en DB
    const passReset = await this.prisma.passwordReset.create({
      data: { token: tokenHashed, expiresAt, userId: user.id },
    });
    const resetId = passReset.id;

    // Lien pour le frontend
    const resetLink = `http://localhost:5173/reset-password?prid=${resetId}&token=${tokenPlain}`;

    // Envoi du mail
    const subject = 'Réinitialisation de votre mot de passe';
    const html = `
      <p>Pour réinitialiser votre mot de passe, cliquez sur le lien suivant :</p>
      <a href="${resetLink}">Réinitialiser mon mot de passe</a>
      <p>Ce lien est valable 10 minutes.</p>
    `;
    await this.mailService.sendMail(user.email, subject, html);

    return {
      message:
        "Si cet email est enregistré, un lien de réinitialisation vous a été envoyé.",
    };
  }

  /**
   * Réinitialisation du mot de passe à partir du PRID et du token
   * (vérification du token stocké en BDD).
   */
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

    // Met à jour le mot de passe
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id: passwordReset.userId },
      data: { password: hashedPassword },
    });

    // Supprime la demande de reset pour éviter la réutilisation
    await this.prisma.passwordReset.delete({ where: { id: prid } });

    return { message: 'Votre mot de passe a été réinitialisé avec succès' };
  }

  /**
   * Active l'OTP pour l'utilisateur (génération d'un secret Speakeasy et QR code).
   * - Mise à jour en base.
   * - Retourne le secret et le QR code en Data URL pour affichage côté frontend.
   */
  async enableOtp(userId: string) {
    // Vérifier si l'utilisateur existe et n'a pas déjà un otpSecret
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new HttpException('Utilisateur introuvable', HttpStatus.NOT_FOUND);
    }
    if (user.otpSecret) {
      throw new HttpException(
        'OTP déjà activé pour cet utilisateur',
        HttpStatus.BAD_REQUEST,
      );
    }
  
    // Génère un nouveau secret avec Speakeasy
    // 'name' et 'issuer' identifieront ton application dans Google Authenticator
    const secret = speakeasy.generateSecret({
      length: 20,
      name: 'MyApp (ex: Google Auth Label)',
      issuer: 'MyApp Issuer',
    });
  
    // Stocke le secret (base32) en DB
    await this.prisma.user.update({
      where: { id: userId },
      data: { otpSecret: secret.base32 },
    });
  
    // Génère l'URL otpauth que Google Authenticator pourra lire
    const otpauthUrl = secret.otpauth_url;
    if (!otpauthUrl) {
      throw new HttpException('Impossible de générer otpauth_url', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  
    // Génère le QR code en Data URL
    const qrCodeDataUrl = await qrcode.toDataURL(otpauthUrl);
  
    return {
      message: 'OTP activé avec succès',
      secret: secret.base32,
      qrCodeDataUrl,
    };
  }

  /**
   * Mise à jour directe du secret OTP d'un user (si nécessaire).
   */
  async setUserOtpSecret(userId: string, otpSecret: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { otpSecret },
    });
    return { message: 'OTP activé' };
  }

  /**
   * Désactive l'OTP (remet otpSecret à null).
   */
  async disableOtp(userId: string) {
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { otpSecret: null },
    });
    return {
      message: 'OTP désactivé avec succès',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        role: updatedUser.role,
      },
    };
  }
}
