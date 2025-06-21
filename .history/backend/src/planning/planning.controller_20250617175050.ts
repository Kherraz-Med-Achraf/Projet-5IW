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
    StreamableFile,
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
  
    /** 1. Lister tous les semestres */
    @Get('semesters')
    @Roles(Role.DIRECTOR, Role.SERVICE_MANAGER, Role.STAFF, Role.PARENT)
    async listSemesters() {
      return this.svc.getAllSemesters();
    }
  
    /** 2. Créer un nouveau semestre (directeur/chef de service) */
    @Post('semesters')
    @Roles(Role.DIRECTOR, Role.SERVICE_MANAGER)
    async createSemester(@Body() dto: CreateSemesterDto) {
      return this.svc.createSemester(dto);
    }
  
    /** 3. Import preview pour un éducateur (directeur/chef de service) */
    @Post('semesters/:semesterId/upload')
    @Roles(Role.DIRECTOR, Role.SERVICE_MANAGER)
    @UseInterceptors(FileInterceptor('file'))
    async uploadAndPreview(
      @Param('semesterId') semesterId: string,
      @UploadedFile() file: Express.Multer.File,
      @Req() req,
    ): Promise<ScheduleEntryDto[]> {
      if (!file) throw new BadRequestException('Fichier manquant');
  
      const sem = await this.svc.getSemesterById(semesterId);
      if (!sem) throw new NotFoundException('Semestre introuvable');
  
      return this.svc.previewExcel(file, semesterId, req.user.id);
    }
  
    /** 4. Import définitif (génération) pour un éducateur */
    @Post('semesters/:semesterId/generate/:staffId')
    @Roles(Role.DIRECTOR, Role.SERVICE_MANAGER)
    @UseInterceptors(FileInterceptor('file'))
    async uploadAndGenerate(
      @Param('semesterId') semesterId: string,
      @Param('staffId') staffId: string,
      @UploadedFile() file: Express.Multer.File,
    ): Promise<{ success: true }> {
      if (!file) throw new BadRequestException('Fichier manquant');
  
      const sem = await this.svc.getSemesterById(semesterId);
      if (!sem) throw new NotFoundException('Semestre introuvable');
  
      await this.svc.importExcel(file, semesterId, staffId);
      return { success: true };
    }
  
    /** 5. Récupérer le planning agrégé pour tout le semestre (preview global) */
    @Get('semesters/:semesterId/overview')
    @Roles(Role.DIRECTOR, Role.SERVICE_MANAGER)
    async getOverview(@Param('semesterId') semesterId: string) {
      const sem = await this.svc.getSemesterById(semesterId);
      if (!sem) throw new NotFoundException('Semestre introuvable');
      return this.svc.getAggregatedSchedule(semesterId);
    }
  
    /** 6. Soumettre le planning final pour le semestre */
    @Post('semesters/:semesterId/submit')
    @Roles(Role.DIRECTOR, Role.SERVICE_MANAGER)
    async submitPlanning(@Param('semesterId') semesterId: string) {
      const sem = await this.svc.getSemesterById(semesterId);
      if (!sem) throw new NotFoundException('Semestre introuvable');
      await this.svc.submitPlanning(semesterId);
      return { success: true };
    }
  
    /** 7. Récupérer son propre planning (staff only) */
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
  
    /** 8. Récupérer le planning d'un enfant (parent only) */
    @Get('semesters/:semesterId/child/:childId')
    @Roles(Role.PARENT)
    async getChildSchedule(
      @Param('semesterId') semesterId: string,
      @Param('childId') childId: string,
      @Req() req,
    ): Promise<ScheduleEntryDto[]> {
      return this.svc.getChildSchedule(semesterId, childId, req.user.id);
    }
  
    /** 9. Télécharger l’Excel importé existant (directeur/chef de service) */
    @Get('semesters/:semesterId/staff/:staffId/export')
    @Roles(Role.DIRECTOR, Role.SERVICE_MANAGER)
    async exportExcel(
      @Param('semesterId') semesterId: string,
      @Param('staffId') staffId: string,
    ): Promise<StreamableFile> {
      const sem = await this.svc.getSemesterById(semesterId);
      if (!sem) throw new NotFoundException('Semestre introuvable');
  
      const buffer = await this.svc.getImportedExcelBuffer(semesterId, staffId);
      return new StreamableFile(buffer, {
        disposition: `attachment; filename="planning-${semesterId}-${staffId}.xlsx"`,
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
    }
  }
  