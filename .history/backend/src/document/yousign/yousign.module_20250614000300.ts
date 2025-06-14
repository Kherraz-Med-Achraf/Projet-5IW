import { Module, Global } from '@nestjs/common';
import { YousignService } from './yousign.service';
import { YousignController } from './yousign.controller';

/**
 * Pas d’HttpModule : on utilise fetch() natif.
 */
@Global()
@Module({
  providers: [YousignService],
  controllers: [YousignController],
  exports: [YousignService],
})
export class YousignModule {}
