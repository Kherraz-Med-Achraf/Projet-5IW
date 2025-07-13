import {
  Body,
  Controller,
  Post,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { IsNotEmpty, IsString, IsOptional } from 'class-validator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CsrfGuard } from '../common/guards/csrf.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { AiService } from './ai.service';

class ImproveMissionDto {
  @IsString()
  @IsNotEmpty()
  prompt!: string;

  @IsString()
  @IsOptional()
  type?: 'mission' | 'observation' | 'progression' | 'blog';

  @IsString()
  @IsOptional()
  subType?: 'title' | 'description';
}

@Controller('ai')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AiController {
  constructor(private readonly ai: AiService) {}

  /**
   * POST /ai/mission-improve
   * Body : { prompt: string, type?: string, subType?: string }
   * Réponse : { suggestion: string }
   */
  @Roles('STAFF', 'ADMIN', 'SECRETARY', 'DIRECTOR', 'SERVICE_MANAGER')
  @Post('mission-improve')
  @UseGuards(CsrfGuard)
  async improveMission(@Body() dto: ImproveMissionDto) {
    if (!dto.prompt.trim()) {
      throw new BadRequestException('Le prompt ne peut pas être vide.');
    }
    const suggestion = await this.ai.improveMission(
      dto.prompt,
      dto.type || 'mission',
      dto.subType,
    );
    return { suggestion };
  }
}
