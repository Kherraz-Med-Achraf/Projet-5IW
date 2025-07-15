import { Module } from '@nestjs/common';
import { BlogController } from './blog.controller';
import { BlogService } from './blog.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AiModule } from '../ai/ai.module';
import { FileValidationService } from '../common/services/file-validation.service';

@Module({
  imports: [PrismaModule, AiModule],
  controllers: [BlogController],
  providers: [BlogService, FileValidationService],
  exports: [BlogService],
})
export class BlogModule {}
