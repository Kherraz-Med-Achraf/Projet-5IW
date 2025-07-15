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
    // Vérifie que le mot de passe n'a pas été changé APRÈS l'émission du token
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });
    if (!user) throw new UnauthorizedException();

    if (
      user.passwordChangedAt &&
      payload.iat * 1000 < new Date(user.passwordChangedAt).getTime()
    ) {
      throw new UnauthorizedException('Token périmé (mot de passe modifié)');
    }

    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
    };
  }
}
