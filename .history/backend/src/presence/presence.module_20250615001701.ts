import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { PrismaModule } from '../prisma/prisma.module';
import { PresenceService } from './presence.service';
import { PresenceController } from './presence.controller';
import { PresenceCron } from './presence.cron';          // ⬅️ nouveau

@Module({
  imports: [
    PrismaModule,
    MulterModule.register({ dest: './uploads/justifications' }),
  ],
  controllers: [PresenceController],
  providers: [PresenceService, PresenceCron],            // ⬅️ ajoute le cron
})
export class PresenceModule {}
