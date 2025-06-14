import { Module, forwardRef } from '@nestjs/common';
import { YousignService }     from './yousign.service';
import { YousignController }  from './yousign.controller';
import { DocumentModule }     from '../document.module';

@Module({
  imports: [
    /* access DocumentService while avoiding circular dependency */
    forwardRef(() => DocumentModule),
  ],
  controllers: [YousignController],
  providers:   [YousignService],
  exports:     [YousignService],
})
export class YousignModule {}
