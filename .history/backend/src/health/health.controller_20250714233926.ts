import { Controller, Get } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';

@Controller('health')
export class HealthController {
  @Get()
  @Public() // 🔓 Endpoint public pour le monitoring (Uptime Kuma)
  getHealth() {
    return { status: 'ok' };
  }
}
