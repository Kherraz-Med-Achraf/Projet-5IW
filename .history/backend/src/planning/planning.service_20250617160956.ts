// src/planning/planning.service.ts
import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import * as XLSX from 'xlsx';
import { PrismaService } from '../prisma/prisma.service';
import { ScheduleEntryDto } from './dto/schedule-entry.dto';
import { CreateSemesterDto } from './dto/create-semester.dto';

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

  /** Crée un nouveau semestre */
  async createSemester(dto: CreateSemesterDto) {
    return this.prisma.semester.create({ data: dto });
  }

  /** Récupère un semestre par son ID */
  async getSemesterById(id: string) {
    return this.prisma.semester.findUnique({ where: { id } });
  }

  /** Récupère le planning hebdo d’un staff pour un semestre donné */
  async getStaffSchedule(
    semesterId: string,
    staffId: string,
  ): Promise<ScheduleEntryDto[]> {
    const entries = await this.prisma.scheduleEntry.findMany({
      where: { semesterId, staffId },
      include: { entryChildren: { include: { child: true } } },
    });

    return entries.map(e => ({
      id: e.id,
      staffId: e.staffId,
      semesterId: e.semesterId,
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

  /**
   * Récupère le planning hebdo d’un enfant pour un semestre,
   * en vérifiant que le parent est bien le vôtre.
   */
  async getChildSchedule(
    semesterId: string,
    childId: string,
    parentUserId: string,
  ): Promise<ScheduleEntryDto[]> {
    const id = parseInt(childId, 10);

    // Vérifier que l'enfant existe et appartient au parent
    const child = await this.prisma.child.findUnique({
      where: { id },
      include: { parent: true },
    });
    if (!child || child.parent.userId !== parentUserId) {
      throw new ForbiddenException("Vous n'avez pas le droit de consulter ce planning");
    }

    // Récupérer toutes les liaisons EntryChild pour cet enfant
    const ecs = await this.prisma.entryChild.findMany({
      where: { childId: id },
      include: {
        entry: {
          include: { entryChildren: { include: { child: true } } },
        },
      },
    });

    // Filtrer sur le semestre et formater
    return ecs
      .filter(ec => ec.entry.semesterId === semesterId)
      .map(ec => ({
        id: ec.entry.id,
        staffId: ec.entry.staffId,
        semesterId: ec.entry.semesterId,
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

  /** Parse l’excel en mémoire et retourne les lignes prêtes */
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
        parsed.push({
          dayOfWeek: dow + 1,
          startStr,
          endStr,
          activity,
          names,
        });
      });
    }

    return parsed;
  }

  /** Convertit une heure "9h30" en Date JS, sur la première semaine du semestre */
  private async parseTime(
    semesterId: string,
    dayOfWeek: number,
    timeStr: string,
  ): Promise<Date> {
    const sem = await this.prisma.semester.findUnique({ where: { id: semesterId } });
    const start = new Date(sem.startDate);
    const day0 = start.getDay(); // 0=dimanche, 1=lundi...
    const diffToMon = (1 - day0 + 7) % 7;
    const firstMonday = new Date(start);
    firstMonday.setDate(start.getDate() + diffToMon);
    const target = new Date(firstMonday);
    target.setDate(firstMonday.getDate() + (dayOfWeek - 1));

    const [hPart, mPart] = timeStr.split('h');
    const h = parseInt(hPart, 10);
    const m = parseInt(mPart || '0', 10);
    target.setHours(h, m, 0, 0);
    return target;
  }

  /**
   * Prévisualise l’import : parse, valide l’existence des enfants et produit des DTO
   */
  async previewExcel(
    file: Express.Multer.File,
    semesterId: string,
    staffId: string,
  ): Promise<ScheduleEntryDto[]> {
    const rows = this.parseExcel(file.buffer);
    const allNames = Array.from(
      new Set(rows.flatMap(r => r.names)),
    );
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

    const dtos: ScheduleEntryDto[] = [];
    for (const r of rows) {
      const startTime = await this.parseTime(semesterId, r.dayOfWeek, r.startStr);
      const endTime = await this.parseTime(semesterId, r.dayOfWeek, r.endStr);
      const linked = children.filter(c =>
        r.names.includes(`${c.firstName} ${c.lastName}`),
      );
      dtos.push({
        id: null, // pas encore en base
        staffId,
        semesterId,
        dayOfWeek: r.dayOfWeek,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        activity: r.activity,
        children: linked.map(c => ({
          id: c.id,
          firstName: c.firstName,
          lastName: c.lastName,
        })),
      });
    }

    return dtos;
  }

  /**
   * Importe définitivement en base : strict rollback en cas d’enfant missing
   */
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
      await tx.scheduleEntry.deleteMany({
        where: { semesterId, staffId },
      });
      for (const r of rows) {
        const startTime = await this.parseTime(semesterId, r.dayOfWeek, r.startStr);
        const endTime = await this.parseTime(semesterId, r.dayOfWeek, r.endStr);
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
          const child = children.find(c => `${c.firstName} ${c.lastName}` === name);
          await tx.entryChild.create({
            data: { entryId: entry.id, childId: child.id },
          });
        }
      }
    });
  }
}
