import {
    Injectable,
    BadRequestException,
    ForbiddenException,
    NotFoundException,
  } from '@nestjs/common';
  // on garde require() pour contourner TS2307 sur xlsx
  const XLSX = require('xlsx');
  import { PrismaService } from '../prisma/prisma.service';
  import { ScheduleEntryDto } from './dto/schedule-entry.dto';
  import { CreateSemesterDto } from './dto/create-semester.dto';
  import { Role } from '@prisma/client';
  import { promises as fs } from 'fs';
  import * as path from 'path';
  
  @Injectable()
  export class PlanningService {
    private readonly uploadDir = path.join(
      process.cwd(),
      'uploads',
      'planning_staff',
    );
  
    constructor(private readonly prisma: PrismaService) {}
  
    /** 1. Renvoie tous les semestres triés */
    async getAllSemesters() {
      return this.prisma.semester.findMany({ orderBy: { startDate: 'asc' } });
    }
  
    /** 2. Crée un nouveau semestre */
    async createSemester(dto: CreateSemesterDto) {
      return this.prisma.semester.create({ data: dto });
    }
  
    /** 3. Récupère un semestre par son ID */
    async getSemesterById(id: string) {
      return this.prisma.semester.findUnique({ where: { id } });
    }
  
    /** 4. Récupère le planning d’un staff pour un semestre */
    async getStaffSchedule(
      semesterId: string,
      staffId: string,
    ): Promise<ScheduleEntryDto[]> {
      const entries = await this.prisma.scheduleEntry.findMany({
        where: { semesterId, staffId },
        include: { entryChildren: { include: { child: true } } },
      });
      return entries.map(e => this.mapToDto(e));
    }
  
    /** 5. Récupère le planning d’un enfant pour un parent vérifié */
    async getChildSchedule(
      semesterId: string,
      childId: string,
      parentUserId: string,
    ): Promise<ScheduleEntryDto[]> {
      const id = parseInt(childId, 10);
      const child = await this.prisma.child.findUnique({
        where: { id },
        include: { parent: true },
      });
      if (!child || child.parent.userId !== parentUserId) {
        throw new ForbiddenException(
          "Vous n'avez pas le droit de consulter ce planning",
        );
      }
      const ecs = await this.prisma.entryChild.findMany({
        where: { childId: id },
        include: {
          entry: { include: { entryChildren: { include: { child: true } } } },
        },
      });
      return ecs
        .filter(ec => ec.entry.semesterId === semesterId)
        .map(ec => this.mapToDto(ec.entry));
    }
  
    /** 6. Récupère tous les créneaux pour un semestre (aperçu global) */
    async getAggregatedSchedule(
      semesterId: string,
    ): Promise<ScheduleEntryDto[]> {
      const entries = await this.prisma.scheduleEntry.findMany({
        where: { semesterId },
        include: { entryChildren: { include: { child: true } } },
      });
      return entries.map(e => this.mapToDto(e));
    }
  
    /**
     * 7. Valide (soumet) le planning : exige qu’un planning existe pour chaque éducateur
     */
    async submitPlanning(semesterId: string): Promise<void> {
      const done = new Set(
        (
          await this.prisma.scheduleEntry.findMany({
            where: { semesterId },
            select: { staffId: true },
            distinct: ['staffId'],
          })
        ).map(e => e.staffId),
      );
      const allStaff = await this.prisma.user.findMany({
        where: { role: Role.STAFF },
        select: { id: true },
      });
      const missing = allStaff.map(s => s.id).filter(id => !done.has(id));
      if (missing.length) {
        throw new BadRequestException(
          `Planning incomplet, pas de créneaux pour ${missing.length} éducateur(s)`,
        );
      }
    }
  
    /** 8. Retourne le buffer du fichier Excel précédemment importé */
    async getImportedExcelBuffer(
      semesterId: string,
    ): Promise<Buffer> {
      const filePath = path.join(this.uploadDir, `${semesterId}.xlsx`);
      try {
        return await fs.readFile(filePath);
      } catch {
        throw new NotFoundException('Fichier Excel non trouvé en stockage');
      }
    }
  
    /** Convertit une entité DB en DTO */
    private mapToDto(e: any): ScheduleEntryDto {
      return {
        id: e.id,
        staffId: e.staffId,
        semesterId: e.semesterId,
        dayOfWeek: e.dayOfWeek,
        startTime: e.startTime.toISOString(),
        endTime: e.endTime.toISOString(),
        activity: e.activity,
        children: e.entryChildren.map((ec: any) => ({
          id: ec.child.id,
          firstName: ec.child.firstName,
          lastName: ec.child.lastName,
        })),
      };
    }
  
    /** Convertit "HH:mm" en Date JS sur la première semaine du semestre */
    private async parseTime(
      semesterId: string,
      dayOfWeek: number,
      timeStr: string,
    ): Promise<Date> {
      const sem = await this.prisma.semester.findUnique({
        where: { id: semesterId },
      });
      if (!sem) throw new NotFoundException('Semestre introuvable');
      const start = new Date(sem.startDate);
      const day0 = start.getDay(); // 0 = dimanche
      const diffToMon = (1 - day0 + 7) % 7;
      const firstMonday = new Date(start);
      firstMonday.setDate(start.getDate() + diffToMon);
      const target = new Date(firstMonday);
      target.setDate(firstMonday.getDate() + (dayOfWeek - 1));
      const [h, m] = timeStr.split(':').map(t => parseInt(t, 10));
      target.setHours(h, m, 0, 0);
      return target;
    }
  
    /**
     * 9. Prévisualisation + validations globales
     */
    async previewExcel(
      file: Express.Multer.File,
      semesterId: string,
    ): Promise<ScheduleEntryDto[]> {
      // ... votre code de previewExcel inchangé ...
    }
  
    /**
     * 10. Import définitif : après validation,
     *     persiste **uniquement si tout est OK** puis sauvegarde le fichier
     */
    async importExcel(
      file: Express.Multer.File,
      semesterId: string,
    ): Promise<void> {
      // 1) Validation complète
      const entries = await this.previewExcel(file, semesterId);
  
      // 2) Transaction DB : si échoue, rien n'est persisté
      await this.prisma.$transaction(async tx => {
        // supprime d’abord l’existant
        await tx.scheduleEntry.deleteMany({ where: { semesterId } });
        // recrée tous les créneaux validés
        for (const e of entries) {
          const entry = await tx.scheduleEntry.create({
            data: {
              staffId: e.staffId,
              semesterId: e.semesterId,
              dayOfWeek: e.dayOfWeek,
              startTime: new Date(e.startTime),
              endTime: new Date(e.endTime),
              activity: e.activity,
            },
          });
          for (const c of e.children) {
            await tx.entryChild.create({
              data: { entryId: entry.id, childId: c.id },
            });
          }
        }
      });
  
      // 3) Enfin, on sauvegarde le fichier sur disque
      await fs.mkdir(this.uploadDir, { recursive: true });
      const fullPath = path.join(this.uploadDir, `${semesterId}.xlsx`);
      await fs.writeFile(fullPath, file.buffer);
    }
  }
  