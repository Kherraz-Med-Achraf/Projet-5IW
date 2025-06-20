import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

@Injectable()
export class CsrfGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    // Seules les requêtes modifiant l'état (POST, PUT, PATCH, DELETE) sont protégées
    const request = context.switchToHttp().getRequest();
    const method = request.method as string;
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase())) {
      return true;
    }

    const tokenCookie: string | undefined = request.cookies?.['csrf_token'];
    const tokenHeader: string | undefined =
      request.headers['x-csrf-token'] || request.get?.('x-csrf-token');

    if (!tokenCookie || !tokenHeader || tokenCookie !== tokenHeader) {
      throw new ForbiddenException('Invalid CSRF token');
    }
    return true;
  }
} 