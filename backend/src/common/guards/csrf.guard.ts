import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import * as crypto from 'crypto';

// Décorateur pour désactiver la protection CSRF sur certaines routes
export const CSRF_EXEMPT_KEY = 'csrf-exempt';
export const CsrfExempt = () => Reflector.createDecorator<boolean>({ key: CSRF_EXEMPT_KEY });

@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const method = request.method;

    // Vérifier si la route est exemptée
    const isExempt = this.reflector.getAllAndOverride<boolean>(
      CSRF_EXEMPT_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (isExempt) {
      return true;
    }

    // Seules les méthodes mutantes nécessitent la protection CSRF
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      return true;
    }

    // Récupérer le token CSRF depuis les headers ou le body
    const csrfToken = request.headers['x-csrf-token'] || request.body?._csrf;
    
    // Récupérer le token de référence depuis les cookies (pas de session)
    const cookieToken = request.cookies?.csrf_token;

    if (!csrfToken) {
      throw new BadRequestException('Token CSRF manquant dans les headers');
    }

    if (!cookieToken) {
      throw new UnauthorizedException('Token CSRF manquant dans les cookies');
    }

    // Vérifier la validité du token
    if (!this.validateCsrfToken(csrfToken, cookieToken)) {
      throw new UnauthorizedException('Token CSRF invalide');
    }

    return true;
  }

  private validateCsrfToken(providedToken: string, sessionToken: string): boolean {
    try {
      // Comparaison sécurisée contre les attaques de timing
      return crypto.timingSafeEqual(
        Buffer.from(providedToken, 'hex'),
        Buffer.from(sessionToken, 'hex')
      );
    } catch (error) {
      return false;
    }
  }

  /**
   * Génère un token CSRF sécurisé
   */
  static generateCsrfToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }
}
