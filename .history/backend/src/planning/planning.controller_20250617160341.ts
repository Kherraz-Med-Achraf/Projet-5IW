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
  import { CreateSemesterDto } from './dtos/create-semester.dto';
  import { ScheduleEntryDto } from './dtos/schedule-entry.dto';
  import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
  import { RolesGuard } from '../common/guards/roles.guard';
  import { Roles } from '../common/decorators/roles.decorator';
  import { Role } from '@prisma/client';
  
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Controller('planning')
  export class PlanningController {
    constructor(private readonly svc: PlanningService) {}
  
    @Post('semesters')
    @Roles(Role.DIRECTOR, Role.SERVICE_MANAGER)
    async createSemester(@Body() dto: CreateSemesterDto) {
      return this.svc.prisma.semester.create({ data: dto });
    }
  
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
      const sem = await this.svc.prisma.semester.findUnique({ where: { id: semesterId } });
      if (!sem) throw new NotFoundException('Semestre introuvable');
  
      return this.svc.previewExcel(file, semesterId, req.user.id);
    }
  
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
      const sem = await this.svc.prisma.semester.findUnique({ where: { id: semesterId } });
      if (!sem) throw new NotFoundException('Semestre introuvable');
  
      await this.svc.importExcel(file, semesterId, staffId);
      return { success: true };
    }
  
    @Get('semesters/:semesterId/staff/:staffId')
    @Roles(Role.STAFF)
    async getMySchedule(
      @Param('semesterId') semesterId: string,
      @Param('staffId') staffId: string,
      @Req() req,
    ): Promise<ScheduleEntryDto[]> {
      // Un staff ne peut consulter que son propre planning
      if (req.user.id !== staffId) {
        throw new ForbiddenException("Vous ne pouvez consulter que votre propre planning");
      }
  
      const entries = await this.svc.prisma.scheduleEntry.findMany({
        where: { semesterId, staffId },
        include: { entryChildren: { include: { child: true } } },
      });
  
      return entries.map(e => ({
        id: e.id,
        staffId,
        semesterId,
        dayOfWeek: e.dayOfWeek,
        startTime: e.startTime.toISOString(),
        endTime: e.endTime.toISOString(),
        activity: e.activity,
        children: e.entryChildren.map(ec => ({
          id: ec.child.id,
          firstName: ec.child.firstName,
          lastName: ec.child.lastName,
        })),
      }));
    }
  
    @Get('semesters/:semesterId/child/:childId')
    @Roles(Role.PARENT)
    async getChildSchedule(
      @Param('semesterId') semesterId: string,
      @Param('childId') childId: string,
      @Req() req,
    ): Promise<ScheduleEntryDto[]> {
      // Vérifier que ce parent est bien responsable de cet enfant
      const child = await this.svc.prisma.child.findUnique({
        where: { id: parseInt(childId, 10) },
        include: { parent: true },
      });
      if (!child || child.parent.userId !== req.user.id) {
        throw new ForbiddenException("Vous n'avez pas le droit de consulter ce planning");
      }
  
      // Récupérer tous les EntryChild pour cet enfant
      const ecs = await this.svc.prisma.entryChild.findMany({
        where: { childId: child.id },
        include: {
          entry: {
            include: { entryChildren: { include: { child: true } } },
          },
        },
      });
  
      // Filtrer sur le semestre et reformater
      return ecs
        .filter(ec => ec.entry.semesterId === semesterId)
        .map(ec => ({
          id: ec.entry.id,
          staffId: ec.entry.staffId,
          semesterId,
          dayOfWeek: ec.entry.dayOfWeek,
          startTime: ec.entry.startTime.toISOString(),
          endTime: ec.entry.endTime.toISOString(),
          activity: ec.entry.activity,
          children: ec.entry.entryChildren.map(ec2 => ({
            id: ec2.child.id,
            firstName: ec2.child.firstName,
            lastName: ec2.child.lastName,
          })),
        }));
    }
  }
  