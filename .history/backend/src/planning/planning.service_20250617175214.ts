// src/planning/planning.service.ts
import {
    Injectable,
    BadRequestException,
    ForbiddenException,
    NotFoundException,
  } from '@nestjs/common';
  // Utilisation de require() pour contourner l’erreur TS2307
  const XLSX = require('xlsx');
  import { PrismaService } from '../prisma/prisma.service';
  import { ScheduleEntryDto } from './dto/schedule-entry.dto';
  import { CreateSemesterDto } from './dto/create-semester.dto';
  import { Role } from '@prisma/client';
  
  interface ParsedRow {
    dayOfWeek: number;
    startStr: string;
    endStr: string;
    activity: string;
    names: string[];
  }
  
  @Injectable()
  export class PlanningService {
    constructor(private readonly prisma: PrismaService) {}
  
    /** 1. Renvoie tous les semestres triés */
    async getAllSemesters() {
      return this.prisma.semester.findMany({
        orderBy: { startDate: 'asc' },
      });
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
        throw new ForbiddenException("Vous n'avez pas le droit de consulter ce planning");
      }
      const ecs = await this.prisma.entryChild.findMany({
        where: { childId: id },
        include: {
          entry: {
            include: { entryChildren: { include: { child: true } } },
          },
        },
      });
      return ecs
        .filter(ec => ec.entry.semesterId === semesterId)
        .map(ec => this.mapToDto(ec.entry));
    }
  
    /** 6. Récupère tous les créneaux pour un semestre (aperçu global) */
    async getAggregatedSchedule(semesterId: string): Promise<ScheduleEntryDto[]> {
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
      // 7a. Liste des staffId ayant au moins un créneau
      const entries = await this.prisma.scheduleEntry.findMany({
        where: { semesterId },
        select: { staffId: true },
        distinct: ['staffId'],
      });
      const done = new Set(entries.map(e => e.staffId));
  
      // 7b. Liste de tous les éducateurs
      const allStaff = await this.prisma.user.findMany({
        where: { role: Role.STAFF },
        select: { id: true },
      });
      const missing = allStaff
        .map(s => s.id)
        .filter(id => !done.has(id));
  
      if (missing.length) {
        throw new BadRequestException(
          `Planning incomplet, pas de créneaux pour ${missing.length} éducateur(s)`,
        );
      }
      // Si tout est OK, on pourrait ici mettre à jour un flag, etc.
    }
  
    /** Mapping interne vers DTO */
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
  
    /** Parse l’excel en mémoire et retourne les lignes prêtes */
    private parseExcel(buffer: Buffer): ParsedRow[] {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      const parsed: ParsedRow[] = [];
  
      for (let i = 1; i < rows.length; i++) {
        const [timeRange, ...days] = rows[i];
        if (!timeRange) continue;
        const [startStr, endStr] = (timeRange as string).split('-').map(s => s.trim());
        days.forEach((cell: string, dow) => {
          if (!cell?.trim()) return;
          const segments = cell.split(',').map(s => s.trim());
          const firstTokens = segments[0].split(' ');
          const childTokens = firstTokens.slice(-2);
          const activity = firstTokens.slice(0, -2).join(' ');
          const names = [childTokens.join(' '), ...segments.slice(1)];
          parsed.push({ dayOfWeek: dow + 1, startStr, endStr, activity, names });
        });
      }
  
      return parsed;
    }
  
    /** Convertit "9h30" en Date JS sur la première semaine du semestre */
    private async parseTime(
      semesterId: string,
      dayOfWeek: number,
      timeStr: string,
    ): Promise<Date> {
      const sem = await this.prisma.semester.findUnique({ where: { id: semesterId } });
      if (!sem) throw new NotFoundException('Semestre introuvable');
      const start = new Date(sem.startDate);
      const day0 = start.getDay();
      const diffToMon = (1 - day0 + 7) % 7;
      const firstMonday = new Date(start);
      firstMonday.setDate(start.getDate() + diffToMon);
      const target = new Date(firstMonday);
      target.setDate(firstMonday.getDate() + (dayOfWeek - 1));
      const [hPart, mPart] = timeStr.split('h');
      target.setHours(parseInt(hPart, 10), parseInt(mPart || '0', 10), 0, 0);
      return target;
    }
  
    /** Prévisualisation : parse, validate et retourne DTO */
    async previewExcel(
      file: Express.Multer.File,
      semesterId: string,
      staffId: string,
    ): Promise<ScheduleEntryDto[]> {
      const rows = this.parseExcel(file.buffer);
      const allNames = Array.from(new Set(rows.flatMap(r => r.names)));
      const children = await this.prisma.child.findMany({
        where: {
          OR: allNames.map(n => {
            const [firstName, lastName] = n.split(' ');
            return { firstName, lastName };
          }),
        },
      });
      const found = new Set(children.map(c => `${c.firstName} ${c.lastName}`));
      const missing = allNames.filter(n => !found.has(n));
      if (missing.length) {
        throw new BadRequestException({
          message: 'Certains enfants sont introuvables en base',
          missing,
        });
      }
  
      return rows.map(r => ({
        id: '', // pas encore en base
        staffId,
        semesterId,
        dayOfWeek: r.dayOfWeek,
        startTime: (await this.parseTime(semesterId, r.dayOfWeek, r.startStr)).toISOString(),
        endTime:   (await this.parseTime(semesterId, r.dayOfWeek, r.endStr)).toISOString(),
        activity: r.activity,
        children: children
          .filter(c => r.names.includes(`${c.firstName} ${c.lastName}`))
          .map(c => ({
            id: c.id,
            firstName: c.firstName,
            lastName: c.lastName,
          })),
      }));
    }
  
    /** Import définitif : rollback en cas d’erreur, puis persist */
    async importExcel(
      file: Express.Multer.File,
      semesterId: string,
      staffId: string,
    ): Promise<void> {
      const rows = this.parseExcel(file.buffer);
      const allNames = Array.from(new Set(rows.flatMap(r => r.names)));
      const children = await this.prisma.child.findMany({
        where: {
          OR: allNames.map(n => {
            const [firstName, lastName] = n.split(' ');
            return { firstName, lastName };
          }),
        },
      });
      const found = new Set(children.map(c => `${c.firstName} ${c.lastName}`));
      const missing = allNames.filter(n => !found.has(n));
      if (missing.length) {
        throw new BadRequestException({
          message: 'Certains enfants sont introuvables en base',
          missing,
        });
      }
  
      await this.prisma.$transaction(async tx => {
        // Supprime les anciens créneaux pour ce staff / semestre
        await tx.scheduleEntry.deleteMany({ where: { semesterId, staffId } });
  
        for (const r of rows) {
          const startTime = await this.parseTime(semesterId, r.dayOfWeek, r.startStr);
          const endTime   = await this.parseTime(semesterId, r.dayOfWeek, r.endStr);
          const entry = await tx.scheduleEntry.create({
            data: {
              staffId,
              semesterId,
              dayOfWeek: r.dayOfWeek,
              startTime,
              endTime,
              activity: r.activity,
            },
          });
          for (const name of r.names) {
            const child = children.find(c => `${c.firstName} ${c.lastName}` === name)!;
            await tx.entryChild.create({
              data: { entryId: entry.id, childId: child.id },
            });
          }
        }
      });
    }
  }
  