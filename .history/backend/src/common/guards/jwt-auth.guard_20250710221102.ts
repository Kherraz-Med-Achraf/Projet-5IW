import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext): boolean | Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;
    
    console.log('🔍 [JwtAuthGuard] Vérification authentification:', {
      url: request.url,
      method: request.method,
      hasAuthHeader: !!authHeader,
      authHeaderPreview: authHeader ? authHeader.substring(0, 20) + '...' : 'null'
    });

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    
    if (isPublic) {
      console.log('✅ [JwtAuthGuard] Route publique, accès autorisé');
      return true;
    }
    
    console.log('🔍 [JwtAuthGuard] Route protégée, validation JWT...');
    return super.canActivate(context) as boolean;
  }

  handleRequest(err: any, user: any, info: any, context: any) {
    console.log('🔍 [JwtAuthGuard] handleRequest:', {
      hasError: !!err,
      hasUser: !!user,
      errorMessage: err?.message,
      infoMessage: info?.message,
      userInfo: user ? { id: user.id, email: user.email, role: user.role } : null
    });

    if (err || !user) {
      console.error('❌ [JwtAuthGuard] Authentification échouée:', {
        error: err?.message || 'Aucun utilisateur',
        info: info?.message
      });
      throw err || new UnauthorizedException('Token JWT invalide ou manquant');
    }
    
    console.log('✅ [JwtAuthGuard] Authentification réussie pour:', user.email);
    return user;
  }
}
