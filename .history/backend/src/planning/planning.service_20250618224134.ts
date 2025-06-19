import {
    Injectable,
    BadRequestException,
    ForbiddenException,
    NotFoundException,
  } from '@nestjs/common';
  import { addDays, addWeeks, differenceInCalendarWeeks } from 'date-fns';

  import Holidays from 'date-holidays';
  const hd = new Holidays('FR', 'fr', 'Europe/Paris');
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
  
    /** 4. Récupère le planning d'un staff pour un semestre */
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
  
    /** 5. Récupère le planning d'un enfant pour un parent vérifié */
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
     * 7. Valide (soumet) le planning : exige qu'un planning existe pour chaque éducateur
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
      const wb = XLSX.read(file.buffer, { type: 'buffer' });
      const sheetNames = wb.SheetNames;
  
      // 1) Charger tous les STAFF en base
      const dbStaff = await this.prisma.user.findMany({
        where: { role: Role.STAFF },
        include: { staffProfile: true },
      });
      const nameToId = new Map<string, string>();
      dbStaff.forEach(u => {
        if (!u.staffProfile) return;
        const key = `${u.staffProfile.firstName} ${u.staffProfile.lastName}`
          .toLowerCase();
        nameToId.set(key, u.id);
      });
      const seenStaff = new Set<string>();
  
      // 2) Charger tous les enfants en base
      const dbChildren = await this.prisma.child.findMany();
      const childKeys = dbChildren.map(c =>
        `${c.firstName} ${c.lastName}`.toLowerCase(),
      );
      const childSet = new Set(childKeys);
  
      // couverture enfants par jour
      const coverage: Record<number, Record<string, { m: boolean; a: boolean }>> = {};
      for (let dow = 1; dow <= 5; dow++) {
        coverage[dow] = {};
        childKeys.forEach(cKey => (coverage[dow][cKey] = { m: false, a: false }));
      }
  
      const allEntries: ScheduleEntryDto[] = [];
  
      for (const sheetName of sheetNames) {
        const dow =
          ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'].indexOf(sheetName) + 1;
        if (!dow) continue;
  
        const sheet = wb.Sheets[sheetName];
        const rows: any[][] = XLSX.utils.sheet_to_json(sheet, {
          header: 1,
          blankrows: false,
        });
  
        // lignes staff à partir de la 2ᵉ
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          const rawName = (row[0] || '').toString().trim();
          if (!rawName) continue;
          const key = rawName.toLowerCase();
          const staffId = nameToId.get(key);
          if (!staffId) {
            throw new BadRequestException(`Éducateur introuvable : "${rawName}"`);
          }
          seenStaff.add(staffId);
  
          const lastIdx = dow === 3 ? 3 : 5;
          for (let idx = 1; idx <= lastIdx; idx++) {
            const cell = (row[idx] || '').toString().trim();
            if (!cell) {
              throw new BadRequestException(
                `Cellule vide pour ${rawName} le ${sheetName}, créneau ${
                  idx <= 3 ? 'matin' : 'après-midi'
                }`,
              );
            }
  
            // sépare activité et liste des enfants
            const [actRaw, namesRaw] = cell.split('–').map(s => s.trim());
            const act = actRaw || '';
            let childrenNames: string[];
  
            if (act.toLowerCase() === 'pause') {
              childrenNames = []; // pas de cours
            } else {
              if (!namesRaw) {
                throw new BadRequestException(
                  `Format invalide [Activité – Enfants] dans ${sheetName}, ligne ${
                    i + 1
                  }, colonne ${idx + 1}`,
                );
              }
              childrenNames = namesRaw
                .split(',')
                .map(s => s.trim().toLowerCase())
                .filter(n => n !== '');
              // cas spécial "tous"
              if (childrenNames.includes('tous')) {
                childrenNames = [...childKeys];
              }
              // validation enfants
              childrenNames.forEach(cn => {
                if (!childSet.has(cn)) {
                  throw new BadRequestException(`Enfant introuvable : "${cn}"`);
                }
              });
            }
  
            // mise à jour coverage
            const block = idx <= 3 ? 'morning' : 'afternoon';
            childrenNames.forEach(cn => {
              coverage[dow][cn][block === 'morning' ? 'm' : 'a'] = true;
            });
  
            // horaire précis
            const times = {
              1: ['09:00', '10:00'],
              2: ['10:00', '11:00'],
              3: ['11:00', '12:00'],
              4: ['14:00', '15:00'],
              5: ['15:00', '16:00'],
            } as Record<number, [string, string]>;
            const [startStr, endStr] = times[idx]!;
            const startTime = (
              await this.parseTime(semesterId, dow, startStr)
            ).toISOString();
            const endTime = (
              await this.parseTime(semesterId, dow, endStr)
            ).toISOString();
  
            allEntries.push({
              id: '',
              staffId,
              semesterId,
              dayOfWeek: dow,
              startTime,
              endTime,
              activity: act,
              children: dbChildren
                .filter(c =>
                  childrenNames.includes(
                    `${c.firstName} ${c.lastName}`.toLowerCase(),
                  ),
                )
                .map(c => ({
                  id: c.id,
                  firstName: c.firstName,
                  lastName: c.lastName,
                })),
            });
          }
        }
      }
  
      // vérifie que chaque staff a été vu
      const missingStaff = dbStaff
        .map(u => u.id)
        .filter(id => !seenStaff.has(id));
      if (missingStaff.length) {
        throw new BadRequestException(
          `Onglets Excel incomplets, manquent ${missingStaff.length} éducateur(s)`,
        );
      }
  
      // vérifie couverture horaires enfants
      const errors: string[] = [];
      for (let dow = 1; dow <= 5; dow++) {
        for (const cn of childKeys) {
          const cov = coverage[dow][cn];
          if (!cov.m) {
            errors.push(
              `Enfant ${cn} sans créneau matin le ${
                ['','Lundi','Mardi','Mercredi','Jeudi','Vendredi'][dow]
              }`,
            );
          }
          if (dow !== 3 && !cov.a) {
            errors.push(
              `Enfant ${cn} sans créneau après-midi le ${
                ['','Lundi','Mardi','Mercredi','Jeudi','Vendredi'][dow]
              }`,
            );
          }
        }
      }
      if (errors.length) {
        throw new BadRequestException({
          message: 'Planning incomplet pour un ou plusieurs enfants',
          details: errors,
        });
      }
  
      return await this._expandEntriesOverSemester(allEntries, semesterId);
    }

    private async _expandEntriesOverSemester(
        baseEntries: ScheduleEntryDto[],
        semesterId: string,
      ): Promise<ScheduleEntryDto[]> {
        const sem = await this.prisma.semester.findUnique({ where: { id: semesterId } });
        if (!sem) throw new NotFoundException('Semestre introuvable');
      
        const start = parseISO(sem.startDate);
        // Ajuste automatiquement la date de fin si le semestre couvre S2 (février-juin)
        let end   = parseISO(sem.endDate);
        const startMonth = start.getMonth(); // 0 = janv.
        if (startMonth >= 1 && startMonth <= 5 /* fév (1) -> juin (5) */) {
          const lastJuneDay = new Date(start.getFullYear(), 5, 30, 23, 59, 59, 999);
          if (end > lastJuneDay) end = lastJuneDay;
        }
      
        const result: ScheduleEntryDto[] = [];
  
        for (const be of baseEntries) {
          // Trouve la première date du bon jour de la semaine >= start
          let current = new Date(start);
          const dowStart = current.getDay(); // 0=Dim, nous voulons 1=Mon … 6=Sat
          const targetDow = be.dayOfWeek % 7; // assure 0=Dim correspondance JS
          const delta = ((targetDow + 7) - (dowStart === 0 ? 7 : dowStart)) % 7; // écart jusqu’au prochain jour voulu
          current.setDate(current.getDate() + delta);
  
          while (current <= end) {
            const entryDate = new Date(current);
  
            const closureLabel = this._getClosureLabel(entryDate);
  
            if (closureLabel) {
              const exists = result.some(r =>
                r.staffId === be.staffId &&
                r.startTime.startsWith(entryDate.toISOString().substring(0, 10)) &&
                r.activity === closureLabel,
              );
              if (!exists) {
                result.push({
                  ...be,
                  startTime: entryDate.toISOString(),
                  endTime:   entryDate.toISOString(),
                  activity: closureLabel,
                  children: [],
                });
              }
            } else {
              const [hS, mS] = be.startTime.substr(11, 5).split(':').map(n => parseInt(n, 10));
              const [hE, mE] = be.endTime.substr(11, 5).split(':').map(n => parseInt(n, 10));
  
              const dtStart = new Date(entryDate);
              dtStart.setHours(hS, mS, 0, 0);
              const dtEnd = new Date(entryDate);
              dtEnd.setHours(hE, mE, 0, 0);
  
              result.push({
                ...be,
                startTime: dtStart.toISOString(),
                endTime:   dtEnd.toISOString(),
              });
            }
  
            // Semaine suivante
            current.setDate(current.getDate() + 7);
          }
        }
  
        return result;
      }
  
    /** Renvoie 'Jour férié' ou 'Vacances' si la date est fermée, sinon null */
    private _getClosureLabel(date: Date): string | null {
      const dNoon = this._atNoon(date);

      // Jour férié national
      const hol = hd.isHoliday(dNoon);
      if (hol) return 'Jour férié';

      // Pont de l'Ascension (vendredi suivant le jeudi d'Ascension)
      const oneDayBefore = this._atNoon(addDays(dNoon, -1));
      const holPrev = hd.isHoliday(oneDayBefore);
      if (holPrev && Array.isArray(holPrev)
        ? holPrev.some((h: any) => (h.name ?? '').toLowerCase().includes('ascension'))
        : (holPrev && (holPrev as any).name?.toLowerCase().includes('ascension'))
      ) {
        return 'Vacances';
      }

      // Vacances scolaires Zone C
      const year = dNoon.getFullYear();
      const vacations: any[] = (hd as any).getVacations(year) ?? [];
      const inZoneC = vacations.find(vac => {
        const zone = (vac.schoolZone ?? vac.zones ?? vac.subregion ?? '').toString().toUpperCase();
        const isC = zone.includes('C') || (vac.name && vac.name.toLowerCase().includes('zone c'));
        if (!isC) return false;
        const start = this._atNoon(new Date(vac.start));
        const end   = this._atNoon(new Date(vac.end));
        return dNoon >= start && dNoon <= end;
      });
      if (inZoneC) return 'Vacances';

      return null;
    }
  
    /** Normalise une date à midi (heure locale), pour éviter les problèmes de fuseau avec date-holidays */
    private _atNoon(date: Date): Date {
      const d = new Date(date);
      d.setHours(12, 0, 0, 0);
      return d;
    }
  
    /**
     * 10. Import définitif : après validation,
     *     persiste **uniquement si tout est OK** puis sauvegarde le fichier
     */
    async importExcel(
      file: Express.Multer.File,
      semesterId: string,
    ): Promise<void> {
      // 1) validation complète
      const entries = await this.previewExcel(file, semesterId);
  
      // 2) transaction DB atomique
      await this.prisma.$transaction(async tx => {
        await tx.scheduleEntry.deleteMany({ where: { semesterId } });
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
  
      // 3) sauvegarde du fichier sur disque
      await fs.mkdir(this.uploadDir, { recursive: true });
      const fullPath = path.join(this.uploadDir, `${semesterId}.xlsx`);
      await fs.writeFile(fullPath, file.buffer);
    }
  }
  
  