// src/staff/staff.module.ts
import { Module } from '@nestjs/common';
import { StaffService } from './staff.service';
import { StaffController } from './staff.controller';

@Module({
  imports: [PrismaModule],
  providers: [StaffService],
  controllers: [StaffController],
})
export class StaffModule {}
