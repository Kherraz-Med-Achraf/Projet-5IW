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
export const CsrfExempt = () => Reflector.createDecorator<boolean>(CSRF_EXEMPT_KEY);

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

    // Vérifier la présence du token CSRF
    const csrfToken = request.headers['x-csrf-token'] || request.body._csrf;
    const sessionToken = request.session?.csrfToken;

    if (!csrfToken) {
      throw new BadRequestException('Token CSRF manquant');
    }

    if (!sessionToken) {
      throw new UnauthorizedException('Session CSRF invalide');
    }

    // Vérifier la validité du token
    if (!this.validateCsrfToken(csrfToken, sessionToken)) {
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
