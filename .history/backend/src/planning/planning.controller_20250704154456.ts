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
  ValidationPipe,
  UsePipes,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { PlanningService } from './planning.service';
import { 
  CreateSemesterDto, 
  SemesterParamsDto, 
  StaffParamsDto, 
  ChildParamsDto,
  EntryParamsDto,
  ChildEntryParamsDto
} from './dto/create-semester.dto';
import { ScheduleEntryDto } from './dto/schedule-entry.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CsrfGuard } from '../common/guards/csrf.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { FileValidationService } from '../common/services/file-validation.service';

@UseGuards(JwtAuthGuard, RolesGuard, CsrfGuard)
@Controller('planning')
export class PlanningController {
  constructor(
    private readonly svc: PlanningService,
    private readonly fileValidationService: FileValidationService,
  ) {}

  /** 1. Lister tous les semestres */
  @Get('semesters')
  @Roles(Role.DIRECTOR, Role.SERVICE_MANAGER, Role.STAFF, Role.PARENT)
  listSemesters() {
    return this.svc.getAllSemesters();
  }

  /** 2. Créer un semestre */
  @Post('semesters')
  @Roles(Role.DIRECTOR, Role.SERVICE_MANAGER)
  @UsePipes(new ValidationPipe({ transform: true }))
  createSemester(@Body() dto: CreateSemesterDto) {
    return this.svc.createSemester(dto);
  }

  /** 3. Prévisualiser l'import global (Excel) */
  @Post('semesters/:semesterId/upload')
  @Roles(Role.DIRECTOR, Role.SERVICE_MANAGER)
  @UsePipes(new ValidationPipe({ transform: true }))
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (req, file, cb) => {
        try {
          // Validation basique du MIME type
          const allowedMimes = [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel'
          ];
          if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
          } else {
            cb(new Error('Seuls les fichiers Excel (.xlsx, .xls) sont autorisés'), false);
          }
        } catch (error) {
          cb(error, false);
        }
      },
    }),
  )
  async uploadAndPreview(
    @Param() params: SemesterParamsDto,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<ScheduleEntryDto[]> {
    if (!file) {
      throw new BadRequestException('Fichier manquant');
    }

    // Validation complète du fichier
    this.fileValidationService.validateExcelFile(file);

    const sem = await this.svc.getSemesterById(params.semesterId);
    if (!sem) {
      throw new NotFoundException('Semestre introuvable');
    }
    return this.svc.previewExcel(file, params.semesterId);
  }

  /** 4. Import définitif global (génération plan + sauvegarde fichier) */
  @Post('semesters/:semesterId/import')
  @Roles(Role.DIRECTOR, Role.SERVICE_MANAGER)
  @UsePipes(new ValidationPipe({ transform: true }))
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (req, file, cb) => {
        try {
          const allowedMimes = [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel'
          ];
          if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
          } else {
            cb(new Error('Seuls les fichiers Excel (.xlsx, .xls) sont autorisés'), false);
          }
        } catch (error) {
          cb(error, false);
        }
      },
    }),
  )
  async importAll(
    @Param() params: SemesterParamsDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Fichier manquant');
    }

    // Validation complète du fichier
    this.fileValidationService.validateExcelFile(file);

    const sem = await this.svc.getSemesterById(params.semesterId);
    if (!sem) {
      throw new NotFoundException('Semestre introuvable');
    }
    await this.svc.importExcel(file, params.semesterId);
    return { success: true };
  }

  /** 5. Aperçu global (toutes entrées) */
  @Get('semesters/:semesterId/overview')
  @Roles(Role.DIRECTOR, Role.SERVICE_MANAGER)
  @UsePipes(new ValidationPipe({ transform: true }))
  getOverview(@Param() params: SemesterParamsDto) {
    return this.svc.getAggregatedSchedule(params.semesterId);
  }

  /** 6. Valider (soumettre) le planning */
  @Post('semesters/:semesterId/submit')
  @Roles(Role.DIRECTOR, Role.SERVICE_MANAGER)
  @UsePipes(new ValidationPipe({ transform: true }))
  async submit(@Param() params: SemesterParamsDto) {
    await this.svc.submitPlanning(params.semesterId);
    return { success: true };
  }

  /** 7. Récupérer le planning d'un staff */
  @Get('semesters/:semesterId/staff/:staffId')
  @Roles(Role.STAFF, Role.DIRECTOR, Role.SERVICE_MANAGER)
  @UsePipes(new ValidationPipe({ transform: true }))
  getStaff(
    @Param() params: StaffParamsDto,
    @Req() req: any,
  ) {
    // Vérification de sécurité : un staff ne peut voir que son propre planning
    if (req.user?.role === Role.STAFF && req.user.id !== params.staffId) {
      throw new ForbiddenException('Accès non autorisé à ce planning');
    }
    return this.svc.getStaffSchedule(params.semesterId, params.staffId);
  }

  /** 8. Récupérer le planning d'un enfant (pour un parent) */
  @Get('semesters/:semesterId/child/:childId')
  @Roles(Role.PARENT)
  @UsePipes(new ValidationPipe({ transform: true }))
  getChild(
    @Param() params: ChildParamsDto,
    @Req() req: any,
  ) {
    return this.svc.getChildSchedule(params.semesterId, params.childId.toString(), req.user.id);
  }

  /** 9. Télécharger l'Excel importé pour le semestre */
  @Get('semesters/:semesterId/download')
  @Roles(Role.DIRECTOR, Role.SERVICE_MANAGER)
  @UsePipes(new ValidationPipe({ transform: true }))
  async download(
    @Param() params: SemesterParamsDto,
  ): Promise<StreamableFile> {
    const buffer = await this.svc.getImportedExcelBuffer(params.semesterId);
    return new StreamableFile(buffer, {
      disposition: `attachment; filename="planning-${params.semesterId}.xlsx"`,
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
  }

  /** 10. Annuler ou réactiver un créneau */
  @Patch('entries/:entryId/cancel')
  @Roles(Role.DIRECTOR, Role.SERVICE_MANAGER)
  @UsePipes(new ValidationPipe({ transform: true }))
  cancelEntry(
    @Param() params: EntryParamsDto,
    @Body('cancel') cancel: boolean = true,
  ) {
    return this.svc.cancelEntry(params.entryId, cancel);
  }

  /** 11. Réaffecter tous les enfants d'un créneau source vers un créneau cible */
  @Patch('entries/:entryId/reassign')
  @Roles(Role.DIRECTOR, Role.SERVICE_MANAGER)
  @UsePipes(new ValidationPipe({ transform: true }))
  reassignChildren(
    @Param() params: EntryParamsDto,
    @Body('targetEntryId') targetEntryId: string,
  ) {
    return this.svc.reassignChildren(params.entryId, targetEntryId);
  }

  /** 12. Réaffecter un enfant d'un créneau source vers un créneau cible */
  @Patch('entries/:entryId/reassign-child/:childId')
  @Roles(Role.DIRECTOR, Role.SERVICE_MANAGER)
  @UsePipes(new ValidationPipe({ transform: true }))
  reassignOneChild(
    @Param() params: ChildEntryParamsDto,
    @Body('targetEntryId') targetEntryId: string,
  ) {
    return this.svc.reassignSingleChild(
      params.entryId,
      params.childId,
      targetEntryId,
    );
  }

  /** 13. Trouver les cours alternatifs disponibles pour un transfert */
  @Get('entries/:entryId/alternatives')
  @Roles(Role.DIRECTOR, Role.SERVICE_MANAGER)
  @UsePipes(new ValidationPipe({ transform: true }))
  findAlternatives(@Param() params: EntryParamsDto) {
    return this.svc.findAlternativeCourses(params.entryId);
  }

  /** 14. Tester la fonctionnalité de traçabilité des transferts */
  @Get('entries/:entryId/transferred-children')
  @Roles(Role.DIRECTOR, Role.SERVICE_MANAGER)
  @UsePipes(new ValidationPipe({ transform: true }))
  async getTransferredChildren(@Param() params: EntryParamsDto) {
    return this.svc.getTransferredChildren(params.entryId);
  }
}
