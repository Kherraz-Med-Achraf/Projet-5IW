import { Module } from '@nestjs/common';
import { YouSignService } from './yousign.service';
import { YouSignWebhookController } from './yousign-webhook.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [YouSignService],
  controllers: [YouSignWebhookController],
  exports: [YouSignService],
})
export class YouSignModule {} 