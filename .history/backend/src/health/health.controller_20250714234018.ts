import { Controller, Get } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';

@Controller('health')
export class HealthController {
  @Get()
  @Public() // 🔓 Endpoint public pour le monitoring (Uptime Kuma) - SÉCURISÉ
  getHealth() {
    // 🔒 SÉCURITÉ: Endpoint minimal sans exposition d'informations sensibles
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      // ❌ Supprimé: version, environment, uptime (informations sensibles)
    };
  }
}
