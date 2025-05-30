import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ServiceManagerService } from './service-manager.service';
import { ServiceManagerController } from './service-manager.controller';

@Module({
  imports: [PrismaModule],
  providers: [ServiceManagerService],
  controllers: [ServiceManagerController],
})
export class ServiceManagerModule {}
