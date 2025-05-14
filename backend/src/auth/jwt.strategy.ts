import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

// Optionnel : tu peux typer le payload si tu veux plus de sécurité
// interface JwtPayload {
//   sub: string;
//   email: string;
//   role: string;
//   iat?: number;
//   exp?: number;
// }

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      // Récupération du token dans le header Authorization: Bearer <token>
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      // Clé secrète pour signer/vérifier le JWT
      secretOrKey: process.env.JWT_SECRET || 'secret',
    });
  }

  async validate(payload: any) {
    // On renvoie un objet "user" qui contient id, email, role
    // Par convention, sub est l'id de l'utilisateur
    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
    };
  }
}
