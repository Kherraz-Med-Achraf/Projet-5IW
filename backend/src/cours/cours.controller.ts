import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  UseGuards,
  ParseIntPipe,
  BadRequestException,
  ValidationPipe,
} from '@nestjs/common';
import { CoursService, CoursProgress } from './cours.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CsrfGuard } from '../common/guards/csrf.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { User } from '../common/decorators/user.decorator';
import { IsString, IsInt, IsOptional, IsNumber, IsObject } from 'class-validator';

// DTOs
export class SaveProgressDto {
  @IsInt()
  childId: number;

  @IsString()
  matiere: string;

  @IsString()
  currentStep: string;

  @IsNumber()
  progressPercent: number;

  @IsOptional()
  @IsObject()
  data?: Record<string, any>;
}

@Controller('cours')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CoursController {
  constructor(private readonly coursService: CoursService) {}

  /**
   * Récupère toutes les matières disponibles pour un enfant
   * Accessible par l'enfant lui-même ou ses parents/staff
   */
  @Roles('CHILD', 'PARENT', 'STAFF', 'DIRECTOR', 'SERVICE_MANAGER', 'SECRETARY', 'ADMIN')
  @Get('child/:childId/matieres')
  async getMatieres(
    @Param('childId', ParseIntPipe) childId: number,
    @User() user: { id: string; role: string },
  ) {
    // TODO: Vérifier que l'utilisateur a accès à cet enfant
    return this.coursService.getMatieres(childId);
  }

  /**
   * Récupère une matière spécifique
   */
  @Roles('CHILD', 'PARENT', 'STAFF', 'DIRECTOR', 'SERVICE_MANAGER', 'SECRETARY', 'ADMIN')
  @Get('child/:childId/matiere/:matiereId')
  async getMatiere(
    @Param('childId', ParseIntPipe) childId: number,
    @Param('matiereId') matiereId: string,
    @User() user: { id: string; role: string },
  ) {
    // TODO: Vérifier que l'utilisateur a accès à cet enfant
    return this.coursService.getMatiere(matiereId, childId);
  }

  /**
   * Récupère la progression d'un enfant pour une matière
   */
  @Roles('CHILD', 'PARENT', 'STAFF', 'DIRECTOR', 'SERVICE_MANAGER', 'SECRETARY', 'ADMIN')
  @Get('child/:childId/progress/:matiere')
  async getProgress(
    @Param('childId', ParseIntPipe) childId: number,
    @Param('matiere') matiere: string,
    @User() user: { id: string; role: string },
  ) {
    // TODO: Vérifier que l'utilisateur a accès à cet enfant
    return this.coursService.getProgress(childId, matiere);
  }

  /**
   * Sauvegarde la progression d'un enfant
   * Principalement utilisé par l'enfant pendant qu'il suit le cours
   */
  @Roles('CHILD', 'STAFF', 'ADMIN')
  @UseGuards(CsrfGuard)
  @Post('progress')
  async saveProgress(
    @Body(ValidationPipe) progressDto: SaveProgressDto,
    @User() user: { id: string; role: string },
  ) {
    // TODO: Vérifier que l'utilisateur a accès à cet enfant
    return this.coursService.saveProgress(progressDto);
  }

  /**
   * Met à jour la progression (plus flexible que saveProgress)
   */
  @Roles('CHILD', 'STAFF', 'ADMIN')
  @UseGuards(CsrfGuard)
  @Put('child/:childId/progress/:matiere')
  async updateProgress(
    @Param('childId', ParseIntPipe) childId: number,
    @Param('matiere') matiere: string,
    @Body() progressData: Partial<CoursProgress>,
    @User() user: { id: string; role: string },
  ) {
    // TODO: Vérifier que l'utilisateur a accès à cet enfant
    const progress: CoursProgress = {
      childId,
      matiere,
      currentStep: progressData.currentStep || 'introduction',
      progressPercent: progressData.progressPercent || 0,
      data: progressData.data || {},
      completedAt: progressData.completedAt,
    };

    return this.coursService.saveProgress(progress);
  }

  /**
   * Marque un cours comme terminé
   */
  @Roles('CHILD', 'STAFF', 'ADMIN')
  @UseGuards(CsrfGuard)
  @Post('child/:childId/complete/:matiere')
  async completeCours(
    @Param('childId', ParseIntPipe) childId: number,
    @Param('matiere') matiere: string,
    @User() user: { id: string; role: string },
  ) {
    // TODO: Vérifier que l'utilisateur a accès à cet enfant
    return this.coursService.completeCours(childId, matiere);
  }

  /**
   * Récupère les statistiques de progression pour un enfant
   */
  @Roles('CHILD', 'PARENT', 'STAFF', 'DIRECTOR', 'SERVICE_MANAGER', 'SECRETARY', 'ADMIN')
  @Get('child/:childId/stats')
  async getChildStats(
    @Param('childId', ParseIntPipe) childId: number,
    @User() user: { id: string; role: string },
  ) {
    // TODO: Vérifier que l'utilisateur a accès à cet enfant
    return this.coursService.getChildStats(childId);
  }

  /**
   * Endpoint de santé pour vérifier que le module cours fonctionne
   */
  @Roles('ADMIN', 'DIRECTOR', 'SERVICE_MANAGER')
  @Get('health')
  async health() {
    return {
      status: 'ok',
      service: 'cours',
      timestamp: new Date().toISOString(),
    };
  }
} 