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
  
  interface ParsedRow {
    dayOfWeek: number;
    startStr: string;
    endStr: string;
    activity: string;
    names: string[];
  }
  
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
        throw new ForbiddenException(
          "Vous n'avez pas le droit de consulter ce planning",
        );
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
      // a) staffId ayant au moins un créneau
      const entries = await this.prisma.scheduleEntry.findMany({
        where: { semesterId },
        select: { staffId: true },
        distinct: ['staffId'],
      });
      const done = new Set(entries.map(e => e.staffId));
  
      // b) tous les éducateurs
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
      // Si tout est OK, on pourrait ici ajouter un flag "published" sur Semester
    }
  
    /** 8. Génère un buffer XLSX pour download de l’Excel importé */
    async getImportedExcelBuffer(
      semesterId: string,
      staffId: string,
    ): Promise<Buffer> {
      const filePath = path.join(
        this.uploadDir,
        `${semesterId}_${staffId}.xlsx`,
      );
      try {
        return await fs.readFile(filePath);
      } catch {
        throw new NotFoundException('Fichier Excel non trouvé en stockage');
      }
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
  
    /** Parse l’Excel en mémoire et retourne les lignes prêtes */
    private parseExcel(buffer: Buffer): ParsedRow[] {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      const parsed: ParsedRow[] = [];
  
      for (let i = 1; i < rows.length; i++) {
        const [timeRange, ...days] = rows[i];
        if (!timeRange) continue;
        const [startStr, endStr] = (timeRange as string)
          .split('-')
          .map(s => s.trim());
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
      const sem = await this.prisma.semester.findUnique({
        where: { id: semesterId },
      });
      if (!sem) throw new NotFoundException('Semestre introuvable');
  
      const start = new Date(sem.startDate);
      const day0 = start.getDay(); // 0=dimanche
      const diffToMon = (1 - day0 + 7) % 7;
      const firstMonday = new Date(start);
      firstMonday.setDate(start.getDate() + diffToMon);
  
      const target = new Date(firstMonday);
      target.setDate(firstMonday.getDate() + (dayOfWeek - 1));
      const [hPart, mPart] = timeStr.split('h');
      target.setHours(parseInt(hPart, 10), parseInt(mPart || '0', 10), 0, 0);
      return target;
    }
  
    /** 9. Prévisualisation : parse, validate staff+enfants et retourne DTO */
    async previewExcel(
      file: Express.Multer.File,
      semesterId: string,
      staffId: string,
    ): Promise<ScheduleEntryDto[]> {
      // --- 9a. Extraction du nom de l’éducateur dans la première ligne ---
      const workbook = XLSX.read(file.buffer, { type: 'buffer' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const allRows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: false });
      const headerRow = allRows[0] || [];
      // on cherche la première cellule texte contenant un espace (prenom + nom)
      const nameCell = headerRow.find(
        c => typeof c === 'string' && c.trim().split(' ').length >= 2,
      ) as string | undefined;
      if (!nameCell) {
        throw new BadRequestException("Nom de l’éducateur introuvable dans l’Excel");
      }
      const [firstName, lastName] = nameCell.trim().split(' ');
      // Vérification en base
      const staffUser = await this.prisma.user.findFirst({
        where: {
          role: Role.STAFF,
          staffProfile: { firstName, lastName },
        },
      });
      if (!staffUser) {
        throw new BadRequestException(`Éducateur introuvable: ${firstName} ${lastName}`);
      }
      if (staffUser.id.toString() !== staffId) {
        throw new BadRequestException(
          `L’éducateur dans l’Excel (${firstName} ${lastName}) ne correspond pas à staffId=${staffId}`,
        );
      }
  
      // --- 9b. Parse des lignes et validation des enfants ---
      const rows = this.parseExcel(file.buffer);
      const allNames = Array.from(new Set(rows.flatMap(r => r.names)));
      const children = await this.prisma.child.findMany({
        where: {
          OR: allNames.map(n => {
            const [fn, ln] = n.split(' ');
            return { firstName: fn, lastName: ln };
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
  
      // --- 9c. Construction du DTO ---
      return Promise.all(
        rows.map(async r => {
          const start = await this.parseTime(semesterId, r.dayOfWeek, r.startStr);
          const end = await this.parseTime(semesterId, r.dayOfWeek, r.endStr);
          return {
            id: '', // pas encore en base
            staffId,
            semesterId,
            dayOfWeek: r.dayOfWeek,
            startTime: start.toISOString(),
            endTime: end.toISOString(),
            activity: r.activity,
            children: children
              .filter(c => r.names.includes(`${c.firstName} ${c.lastName}`))
              .map(c => ({
                id: c.id,
                firstName: c.firstName,
                lastName: c.lastName,
              })),
          };
        }),
      );
    }
  
    /** 
     * 10. Import définitif : rollback en cas d’erreur, persist en base et sauvegarde du fichier 
     */
    async importExcel(
      file: Express.Multer.File,
      semesterId: string,
      staffId: string,
    ): Promise<void> {
      // --- 10a. Sauvegarde du fichier sur disque ---
      await fs.mkdir(this.uploadDir, { recursive: true });
      const filename = `${semesterId}_${staffId}.xlsx`;
      const fullPath = path.join(this.uploadDir, filename);
      await fs.writeFile(fullPath, file.buffer);
  
      // --- 10b. Vérifications comme en preview ---
      const workbook = XLSX.read(file.buffer, { type: 'buffer' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const headerRow = XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: false })[0] || [];
      const nameCell = headerRow.find(
        c => typeof c === 'string' && c.trim().split(' ').length >= 2,
      ) as string | undefined;
      if (!nameCell) {
        throw new BadRequestException("Nom de l’éducateur introuvable dans l’Excel");
      }
      const staffUser = await this.prisma.user.findFirst({
        where: {
          role: Role.STAFF,
          staffProfile: {
            firstName: { equals: firstName, mode: 'insensitive' },
            lastName:  { equals: lastName,  mode: 'insensitive' },
          },
        },
      });
      if (!staffUser) {
        throw new BadRequestException(`Éducateur introuvable: ${firstName} ${lastName}`);
      }
      if (staffUser.id.toString() !== staffId) {
        throw new BadRequestException(
          `L’éducateur dans l’Excel (${firstName} ${lastName}) ne correspond pas à staffId=${staffId}`,
        );
      }
  
      // --- 10c. Lecture, validation enfants et transaction DB ---
      const rows = this.parseExcel(file.buffer);
      const allNames = Array.from(new Set(rows.flatMap(r => r.names)));
      const children = await this.prisma.child.findMany({
        where: {
          OR: allNames.map(n => {
            const [fn, ln] = n.split(' ');
            return { firstName: fn, lastName: ln };
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
        // supprime l’existant
        await tx.scheduleEntry.deleteMany({
          where: { semesterId, staffId },
        });
  
        // recrée
        for (const r of rows) {
          const startTime = await this.parseTime(
            semesterId,
            r.dayOfWeek,
            r.startStr,
          );
          const endTime = await this.parseTime(
            semesterId,
            r.dayOfWeek,
            r.endStr,
          );
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
            const child = children.find(
              c => `${c.firstName} ${c.lastName}` === name,
            )!;
            await tx.entryChild.create({
              data: { entryId: entry.id, childId: child.id },
            });
          }
        }
      });
    }
  }
  