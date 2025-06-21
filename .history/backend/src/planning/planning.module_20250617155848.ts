// src/planning/planning.module.ts
import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PlanningService } from './planning.service';
import { PlanningController } from './planning.controller';
import { MulterModule } from '@nestjs/platform-express';

@Module({
  imports: [
    PrismaModule,
    MulterModule.register({ dest: './uploads' }),
  ],
  providers: [PlanningService],
  controllers: [PlanningController],
})
export class PlanningModule {}
