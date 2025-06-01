import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ParentService } from './parent.service';
import { ParentController } from './parent.controller';

@Module({
  imports: [PrismaModule],
  providers: [ParentService],
  controllers: [ParentController],
})
export class ParentModule {}