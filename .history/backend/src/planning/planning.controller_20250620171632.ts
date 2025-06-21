// src/planning/planning.controller.ts

import {
    Controller,
    Post,
    Get,
    Param,
    Body,
    UploadedFile,
    UseInterceptors,
    BadRequestException,
    NotFoundException,
    UseGuards,
    StreamableFile,
    Req,
    Patch,
    ForbiddenException,
  } from '@nestjs/common';
  import { FileInterceptor } from '@nestjs/platform-express';
  import { memoryStorage } from 'multer';
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
    listSemesters() {
      return this.svc.getAllSemesters();
    }
  
    /** 2. Créer un semestre */
    @Post('semesters')
    @Roles(Role.DIRECTOR, Role.SERVICE_MANAGER)
    createSemester(@Body() dto: CreateSemesterDto) {
      return this.svc.createSemester(dto);
    }
  
    /** 3. Prévisualiser l'import global (Excel) */
    @Post('semesters/:semesterId/upload')
    @Roles(Role.DIRECTOR, Role.SERVICE_MANAGER)
    @UseInterceptors(
      FileInterceptor('file', {
        storage: memoryStorage(),
        limits: { fileSize: 10 * 1024 * 1024 },
      }),
    )
    async uploadAndPreview(
      @Param('semesterId') semesterId: string,
      @UploadedFile() file: Express.Multer.File,
    ): Promise<ScheduleEntryDto[]> {
      if (!file) {
        throw new BadRequestException('Fichier manquant');
      }
      const sem = await this.svc.getSemesterById(semesterId);
      if (!sem) {
        throw new NotFoundException('Semestre introuvable');
      }
      return this.svc.previewExcel(file, semesterId);
    }
  
    /** 4. Import définitif global (génération plan + sauvegarde fichier) */
    @Post('semesters/:semesterId/import')
    @Roles(Role.DIRECTOR, Role.SERVICE_MANAGER)
    @UseInterceptors(
      FileInterceptor('file', {
        storage: memoryStorage(),
        limits: { fileSize: 10 * 1024 * 1024 },
      }),
    )
    async importAll(
      @Param('semesterId') semesterId: string,
      @UploadedFile() file: Express.Multer.File,
    ) {
      if (!file) {
        throw new BadRequestException('Fichier manquant');
      }
      const sem = await this.svc.getSemesterById(semesterId);
      if (!sem) {
        throw new NotFoundException('Semestre introuvable');
      }
      await this.svc.importExcel(file, semesterId);
      return { success: true };
    }
  
    /** 5. Aperçu global (toutes entrées) */
    @Get('semesters/:semesterId/overview')
    @Roles(Role.DIRECTOR, Role.SERVICE_MANAGER)
    getOverview(@Param('semesterId') semesterId: string) {
      return this.svc.getAggregatedSchedule(semesterId);
    }
  
    /** 6. Valider (soumettre) le planning */
    @Post('semesters/:semesterId/submit')
    @Roles(Role.DIRECTOR, Role.SERVICE_MANAGER)
    async submit(@Param('semesterId') semesterId: string) {
      await this.svc.submitPlanning(semesterId);
      return { success: true };
    }
  
    /** 7. Récupérer le planning d'un staff */
    @Get('semesters/:semesterId/staff/:staffId')
    @Roles(Role.STAFF, Role.DIRECTOR, Role.SERVICE_MANAGER)
    getStaff(
      @Param('semesterId') semesterId: string,
      @Param('staffId') staffId: string,
      @Req() req: any,
    ) {
      if (req.user?.role === Role.STAFF && req.user.id !== staffId) {
        throw new ForbiddenException();
      }
      return this.svc.getStaffSchedule(semesterId, staffId);
    }
  
    /** 8. Récupérer le planning d'un enfant (pour un parent) */
    @Get('semesters/:semesterId/child/:childId')
    @Roles(Role.PARENT)
    getChild(
      @Param('semesterId') semesterId: string,
      @Param('childId') childId: string,
      @Req() req: any,
    ) {
      return this.svc.getChildSchedule(semesterId, childId, req.user.id);
    }
  
    /** 9. Télécharger l'Excel importé pour le semestre */
    @Get('semesters/:semesterId/download')
    @Roles(Role.DIRECTOR, Role.SERVICE_MANAGER)
    async download(
      @Param('semesterId') semesterId: string,
    ): Promise<StreamableFile> {
      const buffer = await this.svc.getImportedExcelBuffer(semesterId);
      return new StreamableFile(buffer, {
        disposition: `attachment; filename="planning-${semesterId}.xlsx"`,
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
    }
  
    /** 10. Annuler ou réactiver un créneau */
    @Patch('entries/:entryId/cancel')
    @Roles(Role.DIRECTOR, Role.SERVICE_MANAGER)
    cancelEntry(
      @Param('entryId') entryId: string,
      @Body('cancel') cancel: boolean = true,
    ) {
      return this.svc.cancelEntry(entryId, cancel);
    }
  
    /** 11. Réaffecter tous les enfants d'un créneau source vers un créneau cible */
    @Patch('entries/:entryId/reassign')
    @Roles(Role.DIRECTOR, Role.SERVICE_MANAGER)
    reassignChildren(
      @Param('entryId') entryId: string,
      @Body('targetEntryId') targetEntryId: string,
    ) {
      return this.svc.reassignChildren(entryId, targetEntryId);
    }
  
    /** 12. Réaffecter un enfant d'un créneau source vers un créneau cible */
    @Patch('entries/:entryId/reassign-child/:childId')
    @Roles(Role.DIRECTOR, Role.SERVICE_MANAGER)
    reassignOneChild(
      @Param('entryId') entryId: string,
      @Param('childId') childId: string,
      @Body('targetEntryId') targetEntryId: string,
    ) {
      return this.svc.reassignSingleChild(entryId, parseInt(childId,10), targetEntryId);
    }
  }
  