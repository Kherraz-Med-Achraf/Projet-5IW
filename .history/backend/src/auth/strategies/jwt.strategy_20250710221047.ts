import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { UnauthorizedException } from '@nestjs/common';
import { readSecret } from '../../utils/secret';

const ACCESS_TOKEN_SECRET: string = readSecret(
  '/run/secrets/access_token_secret',
  'ACCESS_TOKEN_SECRET',
);

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: ACCESS_TOKEN_SECRET,
    });
  }

  async validate(payload: any) {
    console.log('🔍 [JWT] Validation du token JWT:', {
      sub: payload.sub,
      email: payload.email,
      role: payload.role,
      iat: payload.iat,
      exp: payload.exp,
      now: Math.floor(Date.now() / 1000)
    });

    // Vérifie que le mot de passe n'a pas été changé APRÈS l'émission du token
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });
    
    if (!user) {
      console.error('❌ [JWT] Utilisateur introuvable:', payload.sub);
      throw new UnauthorizedException('Utilisateur introuvable');
    }

    console.log('✅ [JWT] Utilisateur trouvé:', {
      id: user.id,
      email: user.email,
      role: user.role,
      passwordChangedAt: user.passwordChangedAt
    });

    if (
      user.passwordChangedAt &&
      payload.iat * 1000 < new Date(user.passwordChangedAt).getTime()
    ) {
      console.error('❌ [JWT] Token périmé (mot de passe modifié):', {
        tokenIat: payload.iat * 1000,
        passwordChangedAt: new Date(user.passwordChangedAt).getTime()
      });
      throw new UnauthorizedException('Token périmé (mot de passe modifié)');
    }

    const validatedUser = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
    };
    
    console.log('✅ [JWT] Validation réussie:', validatedUser);
    return validatedUser;
  }
}
