import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CoursService } from './cours.service';
import { CoursController } from './cours.controller';

@Module({
  imports: [PrismaModule],
  controllers: [CoursController],
  providers: [CoursService],
  exports: [CoursService],
})
export class CoursModule {} 