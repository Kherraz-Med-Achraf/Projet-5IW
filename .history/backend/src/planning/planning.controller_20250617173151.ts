// src/planning/planning.controller.ts

import {
    Controller,
    Post,
    Get,
    Param,
    UploadedFile,
    UseInterceptors,
    Req,
    Body,
    BadRequestException,
    ForbiddenException,
    NotFoundException,
    UseGuards,
  } from '@nestjs/common';
  import { FileInterceptor } from '@nestjs/platform-express';
  import { PlanningService } from './planning.service';
  import { CreateSemesterDto } from './dto/create-semester.dto';
  import { ScheduleEntryDto } from './dto/schedule-entry.dto';
  import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
  import { RolesGuard } from '../common/guards/roles.guard';
  import { Roles } from '../common/decorators/roles.decorator';
  import { Role } from '@prisma/client';
  
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Controller('planning')
  export class PlanningController {
    constructor(private readonly svc: PlanningService) {}
  
    /** Liste tous les semestres */
    @Get('semesters')
    @Roles(Role.DIRECTOR, Role.SERVICE_MANAGER, Role.STAFF, Role.PARENT)
    async listSemesters() {
      return this.svc.getAllSemesters();
    }
  
    /** Crée un nouveau semestre (directeur/chef de service) */
    @Post('semesters')
    @Roles(Role.DIRECTOR, Role.SERVICE_MANAGER)
    async createSemester(@Body() dto: CreateSemesterDto) {
      return this.svc.createSemester(dto);
    }
  
    /** Prévisualisation de l’import pour un semestre donné */
    @Post('semesters/:semesterId/upload')
    @Roles(Role.DIRECTOR, Role.SERVICE_MANAGER)
    @UseInterceptors(FileInterceptor('file'))
    async uploadAndPreview(
      @Param('semesterId') semesterId: string,
      @UploadedFile() file: Express.Multer.File,
      @Req() req,
    ): Promise<ScheduleEntryDto[]> {
      if (!file) throw new BadRequestException('Fichier manquant');
  
      // Vérifier que le semestre existe
      const sem = await this.svc.getSemesterById(semesterId);
      if (!sem) throw new NotFoundException('Semestre introuvable');
  
      return this.svc.previewExcel(file, semesterId, req.user.id);
    }
  
    /** Import définitif (génération) du planning pour un staff */
    @Post('semesters/:semesterId/generate/:staffId')
    @Roles(Role.DIRECTOR, Role.SERVICE_MANAGER)
    @UseInterceptors(FileInterceptor('file'))
    async uploadAndGenerate(
      @Param('semesterId') semesterId: string,
      @Param('staffId') staffId: string,
      @UploadedFile() file: Express.Multer.File,
    ): Promise<{ success: true }> {
      if (!file) throw new BadRequestException('Fichier manquant');
  
      // Vérifier que le semestre existe
      const sem = await this.svc.getSemesterById(semesterId);
      if (!sem) throw new NotFoundException('Semestre introuvable');
  
      await this.svc.importExcel(file, semesterId, staffId);
      return { success: true };
    }
  
    /** Récupère le planning du staff connecté (staff uniquement) */
    @Get('semesters/:semesterId/staff/:staffId')
    @Roles(Role.STAFF)
    async getMySchedule(
      @Param('semesterId') semesterId: string,
      @Param('staffId') staffId: string,
      @Req() req,
    ): Promise<ScheduleEntryDto[]> {
      if (req.user.id !== staffId) {
        throw new ForbiddenException(
          "Vous ne pouvez consulter que votre propre planning",
        );
      }
      return this.svc.getStaffSchedule(semesterId, staffId);
    }
  
    /** Récupère le planning d’un enfant pour son parent (parent uniquement) */
    @Get('semesters/:semesterId/child/:childId')
    @Roles(Role.PARENT)
    async getChildSchedule(
      @Param('semesterId') semesterId: string,
      @Param('childId') childId: string,
      @Req() req,
    ): Promise<ScheduleEntryDto[]> {
      return this.svc.getChildSchedule(semesterId, childId, req.user.id);
    }
  }
  