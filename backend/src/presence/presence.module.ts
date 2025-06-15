import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { PrismaModule } from '../prisma/prisma.module';
import { PresenceService } from './presence.service';
import { PresenceController } from './presence.controller';
import { PresenceCron } from './presence.cron';        

@Module({
  imports: [
    PrismaModule,
    MulterModule.register({ dest: './uploads/justifications' }),
  ],
  controllers: [PresenceController],
  providers: [PresenceService, PresenceCron],            
})
export class PresenceModule {}
