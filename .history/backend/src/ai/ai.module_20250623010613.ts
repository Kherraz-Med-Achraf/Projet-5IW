import { Module } from '@nestjs/common'
import { AiController } from './ai.controller'
import { AiService } from './ai.service'

@Module({
  controllers: [AiController],
  providers: [AiService],
  exports: [AiService], // Exporter AiService pour qu'il soit disponible dans d'autres modules
})
export class AiModule {}
