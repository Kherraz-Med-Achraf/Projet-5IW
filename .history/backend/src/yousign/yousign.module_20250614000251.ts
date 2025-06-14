import { Module, Global } from '@nestjs/common';
import { YousignService } from './yousign.service';
import { YousignController } from './yousign.controller';

/**
 * On le marque @Global pour qu’il soit injectable partout
 * sans devoir l’importer dans chaque module.
 */
@Global()
@Module({
  imports: [HttpModule],
  providers: [YousignService],
  controllers: [YousignController],
  exports: [YousignService],
})
export class YousignModule {}
