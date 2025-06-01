import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { DirectorService } from './director.service';
import { DirectorController } from './director.controller';

@Module({
  imports: [PrismaModule],
  providers: [DirectorService],
  controllers: [DirectorController],
})
export class DirectorModule {}
