import { Module, forwardRef } from '@nestjs/common';
import { MulterModule }       from '@nestjs/platform-express';
import { PrismaModule }       from '../prisma/prisma.module';

import { DocumentService }    from './document.service';
import { DocumentController } from './document.controller';
import { YousignModule }      from './yousign/yousign.module';

@Module({
  imports: [
    PrismaModule,

    /* break the circular dep with forwardRef */
    forwardRef(() => YousignModule),

    MulterModule.register({
      dest:   process.env.UPLOAD_TMP_DIR || 'uploads/tmp',
      limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
    }),
  ],
  controllers: [DocumentController],
  providers:   [DocumentService],
  exports:     [DocumentService],
})
export class DocumentModule {}
