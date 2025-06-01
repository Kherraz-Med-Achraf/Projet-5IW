import { Module } from '@nestjs/common';
import { ChildService } from './child.service';
import { ChildController } from './child.controller';
import { PrismaModule } from '../prisma;

@Module({
  imports: [PrismaModule],
  providers: [ChildService],
  controllers: [ChildController],
})
export class ChildModule {}
