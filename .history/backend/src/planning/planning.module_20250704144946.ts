// src/planning/planning.module.ts
import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { PrismaModule } from '../prisma/prisma.module';
import { FileValidationService } from '../common/services/file-validation.service';
import { PlanningService } from './planning.service';
import { PlanningController } from './planning.controller';

@Module({
  imports: [
    PrismaModule,
    MulterModule.register({
      dest: './uploads',
    }),
  ],
  controllers: [PlanningController],
  providers: [PlanningService, FileValidationService],
})
export class PlanningModule {}
