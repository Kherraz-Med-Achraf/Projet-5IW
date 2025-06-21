// src/planning/planning.service.ts
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
      // ... (identique à ce que vous aviez déjà)
    }
  
    /**
     * 10. Import définitif : après validation,
     *     étend la semaine-type à toutes les semaines du semestre
     *     et exclut vacances scolaires (zone C) & jours fériés
     */
    async importExcel(
      file: Express.Multer.File,
      semesterId: string,
    ): Promise<void> {
      // 1) récupération du modèle validé
      const template = await this.previewExcel(file, semesterId);
  
      // 2) lecture du semestre
      const sem = await this.getSemesterById(semesterId);
      if (!sem) throw new NotFoundException('Semestre introuvable');
      const semStart = new Date(sem.startDate);
      const semEnd   = new Date(sem.endDate);
  
      // 3) calcul des périodes de vacances (zone C) pour l'année du semestre
      const y = semStart.getFullYear();
      const vacs = [
        { start: new Date(y, 9, 18),    end: new Date(y, 10, 3)   }, // Toussaint
        { start: new Date(y, 11, 20),   end: new Date(y + 1, 0, 5) }, // Noël
        { start: new Date(y + 1, 1, 7),  end: new Date(y + 1, 1, 23) },// Hiver
        { start: new Date(y + 1, 3, 4),  end: new Date(y + 1, 3, 20)},// Printemps
      ];
      const isInVacation = (d: Date) =>
        vacs.some(v => d >= v.start && d <= v.end);
  
      // 4) quelques jours fériés nationaux (année semStart et semEnd)
      const holidays = [
        new Date(y, 0, 1),   // Jour de l'an
        new Date(y, 4, 1),   // Fête du Travail
        new Date(y, 4, 8),   // Victoire 1945
        new Date(y, 6, 14),  // Fête nationale
        new Date(y, 7, 15),  // Assomption
        new Date(y, 10, 1),  // Toussaint
        new Date(y, 10, 11), // Armistice
        new Date(y, 11, 25), // Noël
        // vous pouvez ajouter Pâques, Ascension, Pentecôte dynamiquement si besoin
        new Date(y + 1, 0, 1),
        new Date(y + 1, 4, 1),
        new Date(y + 1, 4, 8),
        new Date(y + 1, 6, 14),
        new Date(y + 1, 7, 15),
        new Date(y + 1, 10, 1),
        new Date(y + 1, 10, 11),
        new Date(y + 1, 11, 25),
      ].map(d => d.toDateString());
      const isHoliday = (d: Date) =>
        holidays.includes(d.toDateString());
  
      // 5) point de départ : date du premier créneau lundi matin
      const mondayTemplate = template.find(
        e => e.dayOfWeek === 1 && e.startTime.endsWith('09:00:00.000Z'),
      );
      if (!mondayTemplate) {
        throw new BadRequestException('Impossible de déterminer le lundi type');
      }
      const firstMonday = new Date(mondayTemplate.startTime);
  
      // 6) itération hebdomadaire
      const msInDay = 24 * 60 * 60 * 1000;
      const msInWeek = 7 * msInDay;
      const nbWeeks = Math.ceil((semEnd.getTime() - firstMonday.getTime()) / msInWeek) + 1;
  
      // 7) transaction : on remet à zéro puis on recrée
      await this.prisma.$transaction(async tx => {
        // suppression du semestre
        await tx.scheduleEntry.deleteMany({ where: { semesterId } });
  
        for (let w = 0; w < nbWeeks; w++) {
          for (const tpl of template) {
            const origStart = new Date(tpl.startTime).getTime();
            const origEnd   = new Date(tpl.endTime).getTime();
            const start     = new Date(origStart + w * msInWeek);
            const end       = new Date(origEnd   + w * msInWeek);
  
            // 8) filtrage hors semestre
            if (start < semStart || end > semEnd) continue;
            // 9) filtrage vacances & jours fériés
            if (isInVacation(start) || isInVacation(end)) continue;
            if (isHoliday(start)   || isHoliday(end))   continue;
  
            // 10) création
            const entry = await tx.scheduleEntry.create({
              data: {
                staffId:      tpl.staffId,
                semesterId:   tpl.semesterId,
                dayOfWeek:    tpl.dayOfWeek,
                startTime:    start,
                endTime:      end,
                activity:     tpl.activity,
              },
            });
            for (const c of tpl.children) {
              await tx.entryChild.create({
                data: { entryId: entry.id, childId: c.id },
              });
            }
          }
        }
      });
  
      // 11) enfin, on sauvegarde l’excel
      await fs.mkdir(this.uploadDir, { recursive: true });
      const fullPath = path.join(this.uploadDir, `${semesterId}.xlsx`);
      await fs.writeFile(fullPath, file.buffer);
    }
  }
  