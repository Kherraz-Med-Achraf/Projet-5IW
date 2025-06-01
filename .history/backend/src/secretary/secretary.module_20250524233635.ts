import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SecretaryService } from './secretary.service';
import { SecretaryController } from './secretary.controller';

@Module({
  imports: [PrismaModule],
  providers: [SecretaryService],
  controllers: [SecretaryController],
})
export class SecretaryModule {}
