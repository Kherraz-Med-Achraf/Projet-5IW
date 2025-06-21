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
  async getAggregatedSchedule(
    semesterId: string,
  ): Promise<ScheduleEntryDto[]> {
    const entries = await this.prisma.scheduleEntry.findMany({
      where: { semesterId },
      include: { entryChildren: { include: { child: true } } },
    });
    return entries.map(e => this.mapToDto(e));
  }

  /** 7. Valide le planning : vérifie que chaque éducateur a au moins un créneau */
  async submitPlanning(semesterId: string): Promise<void> {
    const entries = await this.prisma.scheduleEntry.findMany({
      where: { semesterId },
      select: { staffId: true },
      distinct: ['staffId'],
    });
    const done = new Set(entries.map(e => e.staffId));

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
    // Ici tu pourrais, par exemple, mettre à jour un flag "published" sur Semester
  }

  /** 8. Retourne le buffer XLSX du fichier importé */
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

  /** 9. Preview + validation staff & enfants */
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
    const nameCell = headerRow.find(
      c => typeof c === 'string' && c.trim().split(' ').length >= 2,
    ) as string | undefined;
    if (!nameCell) {
      throw new BadRequestException("Nom de l’éducateur introuvable dans l’Excel");
    }
    // splitting en limitant à 2 tokens pour le nom de famille
    const tokens = nameCell.trim().split(' ');
    const firstName = tokens.slice(0, -1).join(' ');
    const lastName  = tokens.slice(-1)[0];

    // Vérification insensible à la casse
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

    // --- 9b. Parse des lignes et validation enfant ---
    const rows = this.parseExcel(file.buffer);
    const allNames = Array.from(new Set(rows.flatMap(r => r.names)));
    const children = await this.prisma.child.findMany({
      where: { OR: allNames.map(n => {
        const [fn, ln] = n.split(' ');
        return { firstName: fn, lastName: ln };
      }) },
    });
    const found = new Set(children.map(c => `${c.firstName} ${c.lastName}`));
    const missing = allNames.filter(n => !found.has(n));
    if (missing.length) {
      throw new BadRequestException({
        message: 'Certains enfants sont introuvables en base',
        missing,
      });
    }

    // --- 9c. Construction du DTO final ---
    return Promise.all(rows.map(async r => {
      const start = await this.parseTime(semesterId, r.dayOfWeek, r.startStr);
      const end   = await this.parseTime(semesterId, r.dayOfWeek, r.endStr);
      return {
        id: '', // pas encore persisté
        staffId,
        semesterId,
        dayOfWeek: r.dayOfWeek,
        startTime: start.toISOString(),
        endTime:   end.toISOString(),
        activity:  r.activity,
        children: children
          .filter(c => r.names.includes(`${c.firstName} ${c.lastName}`))
          .map(c => ({
            id:        c.id,
            firstName: c.firstName,
            lastName:  c.lastName,
          })),
      };
    }));
  }

  /** 10. Import définitif + sauvegarde du fichier */
  async importExcel(
    file: Express.Multer.File,
    semesterId: string,
    staffId: string,
  ): Promise<void> {
    // 10a. Sauvegarde du fichier
    await fs.mkdir(this.uploadDir, { recursive: true });
    const filename = `${semesterId}_${staffId}.xlsx`;
    const fullPath = path.join(this.uploadDir, filename);
    await fs.writeFile(fullPath, file.buffer);

    // 10b. Réutilisation de la logique de preview pour staff + enfants
    const workbook = XLSX.read(file.buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const headerRow = XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: false })[0] || [];
    const nameCell = headerRow.find(
      c => typeof c === 'string' && c.trim().split(' ').length >= 2,
    ) as string|undefined;
    if (!nameCell) {
      throw new BadRequestException("Nom de l’éducateur introuvable dans l’Excel");
    }
    const tokens = nameCell.trim().split(' ');
    const firstName = tokens.slice(0, -1).join(' ');
    const lastName  = tokens.slice(-1)[0];

    // Vérification staff
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

    // 10c. Insertion en transaction
    const rows = this.parseExcel(file.buffer);
    const allNames = Array.from(new Set(rows.flatMap(r => r.names)));
    const children = await this.prisma.child.findMany({
      where: { OR: allNames.map(n => {
        const [fn, ln] = n.split(' ');
        return { firstName: fn, lastName: ln };
      }) },
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
      await tx.scheduleEntry.deleteMany({ where: { semesterId, staffId } });
      // recrée
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

  /** utilitaire */
  private mapToDto(e: any): ScheduleEntryDto {
    return {
      id:         e.id,
      staffId:    e.staffId,
      semesterId: e.semesterId,
      dayOfWeek:  e.dayOfWeek,
      startTime:  e.startTime.toISOString(),
      endTime:    e.endTime.toISOString(),
      activity:   e.activity,
      children:   e.entryChildren.map((ec: any) => ({
        id:        ec.child.id,
        firstName: ec.child.firstName,
        lastName:  ec.child.lastName,
      })),
    };
  }

  private parseExcel(buffer: Buffer): ParsedRow[] {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheet    = workbook.Sheets[workbook.SheetNames[0]];
    const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    const parsed: ParsedRow[] = [];
    for (let i = 1; i < rows.length; i++) {
      const [timeRange, ...days] = rows[i];
      if (!timeRange) continue;
      const [startStr, endStr] = (timeRange as string).split('-').map(s => s.trim());
      days.forEach((cell: string, dow) => {
        if (!cell?.trim()) return;
        const segments   = cell.split(',').map(s => s.trim());
        const firstTokens= segments[0].split(' ');
        const childTokens= firstTokens.slice(-2);
        const activity   = firstTokens.slice(0, -2).join(' ');
        const names      = [childTokens.join(' '), ...segments.slice(1)];
        parsed.push({ dayOfWeek: dow + 1, startStr, endStr, activity, names });
      });
    }
    return parsed;
  }

  private async parseTime(
    semesterId: string,
    dayOfWeek: number,
    timeStr: string,
  ): Promise<Date> {
    const sem = await this.prisma.semester.findUnique({ where: { id: semesterId } });
    if (!sem) throw new NotFoundException('Semestre introuvable');
    const start    = new Date(sem.startDate);
    const day0     = start.getDay();
    const diffToMon= (1 - day0 + 7) % 7;
    const firstMon = new Date(start);
    firstMon.setDate(start.getDate() + diffToMon);
    const target   = new Date(firstMon);
    target.setDate(firstMon.getDate() + (dayOfWeek - 1));
    const [h, m] = timeStr.split('h');
    target.setHours(parseInt(h, 10), parseInt(m||'0', 10), 0, 0);
    return target;
  }
}
