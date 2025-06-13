// src/journal/journal.module.ts
import { Module } from '@nestjs/common';
import { JournalService } from './journal.service';
import { JournalController } from './journal.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  providers: [JournalService, PrismaService],
  controllers: [JournalController],
  exports: [JournalService],
})
export class JournalModule {}
