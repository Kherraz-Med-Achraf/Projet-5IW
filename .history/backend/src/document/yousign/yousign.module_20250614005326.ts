import { Module, forwardRef } from '@nestjs/common';
import { YousignService } from './yousign.service';
import { YousignController } from './yousign.controller';
import { DocumentModule } from '../document.module';     // ← module qui fournit DocumentService

@Module({
  imports: [
    forwardRef(() => DocumentModule),                    // ← règle la dépendance et expose le service
  ],
  controllers: [YousignController],
  providers:   [YousignService],
  exports:     [YousignService],                         // (optionnel : si d’autres modules en ont besoin)
})
export class YousignModule {}
