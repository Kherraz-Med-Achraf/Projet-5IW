import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { MailModule } from '../mail/mail.module';
import { InvitationService } from './invitation.service';
import { InvitationController } from './invitation.controller';

@Module({
  imports: [PrismaModule, MailModule],
  providers: [InvitationService],
  controllers: [InvitationController],
  exports: [InvitationService], 
})
export class InvitationModule {}
