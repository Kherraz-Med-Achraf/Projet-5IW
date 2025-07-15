// src/mission/mission.module.ts
import { Module } from '@nestjs/common';
import { MissionService } from './mission.service';
import { MissionController } from './mission.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  providers: [MissionService, PrismaService],
  controllers: [MissionController],
  exports: [MissionService],
})
export class MissionModule {}
