import { Controller, Get, Req } from '@nestjs/common';
import { Request } from 'express';
import { Public } from '../common/decorators/public.decorator';

@Controller('health')
export class HealthController {
  @Get()
  @Public() // 🔓 Endpoint public pour le monitoring (Uptime Kuma) - SÉCURISÉ
  getHealth(@Req() req: Request) {
    // 🔒 SÉCURITÉ: Endpoint minimal sans exposition d'informations sensibles
    
    // 📊 Logging sécurisé pour monitoring (sans exposer d'infos sensibles)
    const userAgent = req.get('User-Agent') || 'Unknown';
    const isMonitoringTool = userAgent.includes('uptime-kuma') || 
                           userAgent.includes('curl') || 
                           userAgent.includes('wget');
    
    // Log seulement si ce n'est pas un outil de monitoring classique
    if (!isMonitoringTool) {
      console.log(`[HEALTH] Access from: ${req.ip} | UA: ${userAgent.substring(0, 50)}`);
    }
    
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      // ❌ Supprimé: version, environment, uptime (informations sensibles)
    };
  }
}
