import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { EmergencyContactService } from './emergency-contact.service';
import { EmergencyContactController } from './emergency-contact.controller';

@Module({
  imports: [PrismaModule],
  providers: [EmergencyContactService],
  controllers: [EmergencyContactController],
})
export class EmergencyContactModule {}
