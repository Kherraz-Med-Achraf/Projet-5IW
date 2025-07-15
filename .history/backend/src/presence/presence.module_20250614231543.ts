import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { PrismaModule } from '../prisma/prisma.module';
import { PresenceService } from './presence.service';
import { PresenceController } from './presence.controller';

@Module({
  imports: [
    PrismaModule,
    MulterModule.register({ dest: './uploads/justifications' }),
  ],
  providers: [PresenceService],
  controllers: [PresenceController],
})
export class PresenceModule {}