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
    UseGuards,
  } from '@nestjs/common';
  import { FileInterceptor } from '@nestjs/platform-express';
  import { PlanningService } from './planning.service';
  import { CreateSemesterDto } from './dtos/create-semester.dto';
  import { UploadExcelDto } from './dtos/upload-excel.dto';
  import { ScheduleEntryDto } from './dtos/schedule-entry.dto';
  import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
  import { RolesGuard } from '../auth/guards/roles.guard';
  import { Roles } from '../auth/decorators/roles.decorator';
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
      @Param() params: UploadExcelDto,
      @UploadedFile() file: Express.Multer.File,
      @Req() req,
    ): Promise<ScheduleEntryDto[]> {
      if (!file) throw new BadRequestException('Fichier manquant');
      return this.svc.previewExcel(file, params.semesterId, req.user.id);
    }
  
    @Post('semesters/:semesterId/generate/:staffId')
    @Roles(Role.DIRECTOR, Role.SERVICE_MANAGER)
    @UseInterceptors(FileInterceptor('file'))
    async uploadAndGenerate(
      @Param() params: UploadExcelDto & { staffId: string },
      @UploadedFile() file: Express.Multer.File,
      @Req() req,
    ): Promise<{ success: true }> {
      if (!file) throw new BadRequestException('Fichier manquant');
      await this.svc.importExcel(file, params.semesterId, params.staffId);
      return { success: true };
    }
  
    @Get('semesters/:semesterId/staff/:staffId')
    @Roles(Role.STAFF)
    async getMySchedule(
      @Param('semesterId') semId: string,
      @Param('staffId') staffId: string,
    ): Promise<ScheduleEntryDto[]> {
      // TODO: n’autoriser que req.user.id == staffId
      const entries = await this.svc.prisma.scheduleEntry.findMany({
        where: { semesterId: semId, staffId },
        include: { entryChildren: { include: { child: true } } },
      });
      return entries.map(e => ({
        id: e.id,
        staffId,
        semesterId: semId,
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
      @Param('semesterId') semId: string,
      @Param('childId') childId: string,
    ): Promise<ScheduleEntryDto[]> {
      // TODO: vérifier que req.user est parent de childId
      const ecs = await this.svc.prisma.entryChild.findMany({
        where: { childId: parseInt(childId, 10) },
        include: { entry: true, entry: { include: { semester: false, entryChildren: { include: { child: true } } } } },
      });
      // filtrer sur semesterId et reformatter
      return ecs
        .filter(ec => ec.entry.semesterId === semId)
        .map(ec => ({
          id: ec.entry.id,
          staffId: ec.entry.staffId,
          semesterId: semId,
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
  