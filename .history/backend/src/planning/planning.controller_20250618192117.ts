import {
    Controller,
    Post,
    Get,
    Param,
    UploadedFile,
    UseInterceptors,
    Req,                      // <-- bien importé
    Body,
    BadRequestException,
    ForbiddenException,       // <-- bien importé
    NotFoundException,
    UseGuards,
    StreamableFile,
  } from '@nestjs/common'
  import { FileInterceptor } from '@nestjs/platform-express'
  import { memoryStorage } from 'multer'
  import { PlanningService } from './planning.service'
  import { CreateSemesterDto } from './dto/create-semester.dto'
  import { ScheduleEntryDto } from './dto/schedule-entry.dto'
  import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
  import { RolesGuard } from '../common/guards/roles.guard'
  import { Roles } from '../common/decorators/roles.decorator'
  import { Role } from '@prisma/client'
  
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Controller('planning')
  export class PlanningController {
    constructor(private readonly svc: PlanningService) {}
  
    /** 1. Lister tous les semestres */
    @Get('semesters')
    @Roles(Role.DIRECTOR, Role.SERVICE_MANAGER, Role.STAFF, Role.PARENT)
    async listSemesters() {
      return this.svc.getAllSemesters()
    }
  
    /** 2. Créer un nouveau semestre */
    @Post('semesters')
    @Roles(Role.DIRECTOR, Role.SERVICE_MANAGER)
    async createSemester(@Body() dto: CreateSemesterDto) {
      return this.svc.createSemester(dto)
    }
  
    /**
     * 3. Import preview global (un seul Excel multi‐feuilles)
     */
    @Post('semesters/:semesterId/upload')
    @Roles(Role.DIRECTOR, Role.SERVICE_MANAGER)
    @UseInterceptors(
      FileInterceptor('file', {
        storage: memoryStorage(),
        limits: { fileSize: 10 * 1024 * 1024 },
      })
    )
    async uploadAndPreview(
      @Param('semesterId') semesterId: string,
      @UploadedFile() file: Express.Multer.File
    ): Promise<ScheduleEntryDto[]> {
      if (!file) throw new BadRequestException('Fichier manquant')
      const sem = await this.svc.getSemesterById(semesterId)
      if (!sem) throw new NotFoundException('Semestre introuvable')
      return this.svc.previewExcel(file, semesterId)
    }
  
    /**
     * 4. Import définitif global
     */
    @Post('semesters/:semesterId/import')
    @Roles(Role.DIRECTOR, Role.SERVICE_MANAGER)
    @UseInterceptors(
      FileInterceptor('file', {
        storage: memoryStorage(),
        limits: { fileSize: 10 * 1024 * 1024 },
      })
    )
    async importAll(
      @Param('semesterId') semesterId: string,
      @UploadedFile() file: Express.Multer.File
    ): Promise<{ success: true }> {
      if (!file) throw new BadRequestException('Fichier manquant')
      const sem = await this.svc.getSemesterById(semesterId)
      if (!sem) throw new NotFoundException('Semestre introuvable')
      await this.svc.importExcel(file, semesterId)
      return { success: true }
    }
  
    /** 5. Aperçu global */
    @Get('semesters/:semesterId/overview')
    @Roles(Role.DIRECTOR, Role.SERVICE_MANAGER)
    async getOverview(@Param('semesterId') semesterId: string) {
      const sem = await this.svc.getSemesterById(semesterId)
      if (!sem) throw new NotFoundException('Semestre introuvable')
      return this.svc.getAggregatedSchedule(semesterId)
    }
  
    /** 6. Soumettre le planning final */
    @Post('semesters/:semesterId/submit')
    @Roles(Role.DIRECTOR, Role.SERVICE_MANAGER)
    async submitPlanning(@Param('semesterId') semesterId: string) {
      const sem = await this.svc.getSemesterById(semesterId)
      if (!sem) throw new NotFoundException('Semestre introuvable')
      await this.svc.submitPlanning(semesterId)
      return { success: true }
    }
  
    /** 7. Planning d’un staff (uniquement pour lui-même) */
    @Get('semesters/:semesterId/staff/:staffId')
    @Roles(Role.STAFF)
    async getMySchedule(
      @Param('semesterId') semesterId: string,
      @Param('staffId') staffId: string,
      @Req() req                            // <-- Req existe maintenant
    ): Promise<ScheduleEntryDto[]> {
      if (req.user.id !== staffId) {
        throw new ForbiddenException(
          "Vous ne pouvez consulter que votre propre planning"
        )
      }
      return this.svc.getStaffSchedule(semesterId, staffId)
    }
  
    /** 8. Planning d’un enfant (parent only) */
    @Get('semesters/:semesterId/child/:childId')
    @Roles(Role.PARENT)
    async getChildSchedule(
      @Param('semesterId') semesterId: string,
      @Param('childId') childId: string,
      @Req() req
    ): Promise<ScheduleEntryDto[]> {
      return this.svc.getChildSchedule(semesterId, childId, req.user.id)
    }
  
    /** 9. Télécharger l’Excel global */
    @Get('semesters/:semesterId/download')
    @Roles(Role.DIRECTOR, Role.SERVICE_MANAGER)
    async exportExcel(@Param('semesterId') semesterId: string): Promise<StreamableFile> {
      const sem = await this.svc.getSemesterById(semesterId)
      if (!sem) throw new NotFoundException('Semestre introuvable')
      const buffer = await this.svc.getImportedExcelBuffer(semesterId)
      return new StreamableFile(buffer, {
        disposition: `attachment; filename="planning-${semesterId}.xlsx"`,
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
    }
  }
  