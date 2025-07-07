import {
    Injectable,
    BadRequestException,
    ForbiddenException,
    NotFoundException,
  } from '@nestjs/common';
   import { addDays, addWeeks, differenceInCalendarWeeks } from 'date-fns';
   // on garde require() pour contourner les problèmes d'import ESM/CommonJS
   const Holidays = require('date-holidays');
   const hd = new Holidays('FR', 'fr', 'Europe/Paris');
  // on garde require() pour contourner TS2307 sur xlsx
  const XLSX = require('xlsx');
  import { PrismaService } from '../prisma/prisma.service';
  import { ScheduleEntryDto } from './dto/schedule-entry.dto';
  import { CreateSemesterDto } from './dto/create-semester.dto';
  import { Role } from '@prisma/client';
  import { promises as fs } from 'fs';
  import * as path from 'path';
  
  // Utilitaire fetch (Node 18+) ou node-fetch fallback
  const _fetch: typeof fetch = (globalThis as any).fetch ?? require('node-fetch');
  
  @Injectable()
  export class PlanningService {
    private readonly uploadDir = path.join(
      process.cwd(),
      'uploads',
      'planning_staff',
    );
  
    /** Cache <année, périodes de vacances> */
    private vacationsCache = new Map<number, { start: string; end: string }[]>();
  
    /** Contenu brut de l'ICS Zone C (chargé une seule fois) */
    private icsData: string | null = null;
  
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
      const base = ecs
        .filter(ec => ec.entry.semesterId === semesterId)
        .map(ec => this.mapToDto(ec.entry));

      // Ajout des événements uniques du samedi (inscription parent payée)
      const sem = await this.prisma.semester.findUnique({ where: { id: semesterId } });
      if (sem) {
        const regs = await this.prisma.eventRegistrationChild.findMany({
          where: {
            childId: id,
            registration: {
              paymentStatus: { in: ['PAID', 'FREE'] },
              event: { date: { gte: sem.startDate, lte: sem.endDate } },
            },
          },
          include: {
            registration: { include: { event: true } },
            child: true,
          },
        });

        regs.forEach(rc => {
          const ev = rc.registration.event;
          const start = this._toIsoLocal(ev.startTime);
          const end   = this._toIsoLocal(ev.endTime);
          const dateStr = ev.date.toISOString().substring(0,10);

          base.push({
            id: `evt-${rc.registrationId}`,
            staffId: '',
            semesterId,
            dayOfWeek: ((ev.date.getDay() || 7)),
            startTime: `${dateStr}T${start.substring(11)}`,
            endTime:   `${dateStr}T${end.substring(11)}`,
            activity: this._sanitize(ev.title),
            children: [{ id: rc.child.id, firstName: rc.child.firstName, lastName: rc.child.lastName }],
          });
        });
      }

      return base;
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
        include: { staffProfile: true },
      });
      const missing = allStaff.filter(staff => !done.has(staff.id));
      if (missing.length) {
        const missingNames = missing.map(staff => 
          `${staff.staffProfile?.firstName || 'N/A'} ${staff.staffProfile?.lastName || 'N/A'}`
        ).join(', ');
        throw new BadRequestException(
          `Planning incomplet pour les éducateurs suivants : ${missingNames}`,
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
        activity: this._sanitize(e.activity),
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
  
    /** ISO local (sans suffixe Z) → évite le décalage horaire côté front */
    private _toIsoLocal(d: Date): string {
      const pad = (n: number) => n.toString().padStart(2, '0');
      return (
        `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
        `T${pad(d.getHours())}:${pad(d.getMinutes())}:00`
      );
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

      // couverture enfants par jour et par créneau (5 créneaux par jour)
      const coverage: Record<number, Record<string, boolean[]>> = {};
      for (let dow = 1; dow <= 5; dow++) {
        coverage[dow] = {};
        childKeys.forEach(cKey => {
          const slotsNeeded = dow === 3 ? 3 : 5; // Mercredi seulement 3 créneaux
          coverage[dow][cKey] = new Array(slotsNeeded).fill(false);
        });
      }

      // Détection des conflits éducateurs : Map<staffId, Map<dow, Map<timeSlot, activity>>>
      const staffConflicts = new Map<string, Map<number, Map<number, string>>>();
  
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
          // horaires fixes pour validation
          const times = {
            1: ['09:00', '10:00'],
            2: ['10:00', '11:00'],
            3: ['11:00', '12:00'],
            4: ['14:00', '15:00'],
            5: ['15:00', '16:00'],
          } as Record<number, [string, string]>;
          
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
            const act = this._sanitize(actRaw || '');
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
  
            // mise à jour coverage pour ce créneau spécifique
            childrenNames.forEach(cn => {
              coverage[dow][cn][idx - 1] = true; // idx-1 car les créneaux commencent à 1
            });

            // Détection des conflits éducateurs
            if (!staffConflicts.has(staffId)) {
              staffConflicts.set(staffId, new Map());
            }
            if (!staffConflicts.get(staffId)!.has(dow)) {
              staffConflicts.get(staffId)!.set(dow, new Map());
            }
            const existingActivity = staffConflicts.get(staffId)!.get(dow)!.get(idx);
            if (existingActivity) {
              throw new BadRequestException(
                `Conflit éducateur : ${rawName} est affecté à "${existingActivity}" ET "${act}" le ${
                  ['','Lundi','Mardi','Mercredi','Jeudi','Vendredi'][dow]
                } de ${times[idx]![0]} à ${times[idx]![1]}`
              );
            }
            staffConflicts.get(staffId)!.get(dow)!.set(idx, act);
  
            // horaire précis
            const times = {
              1: ['09:00', '10:00'],
              2: ['10:00', '11:00'],
              3: ['11:00', '12:00'],
              4: ['14:00', '15:00'],
              5: ['15:00', '16:00'],
            } as Record<number, [string, string]>;
            const [startStr, endStr] = times[idx]!;
            const startTime = this._toIsoLocal(
              await this.parseTime(semesterId, dow, startStr)
            );
            const endTime = this._toIsoLocal(
              await this.parseTime(semesterId, dow, endStr)
            );
  
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
  
      // Assure les données vacances chargées pour toute la période du semestre
      await this._ensureVacationsForSemester(semesterId);
  
      return await this._expandEntriesOverSemester(allEntries, semesterId);
    }

    private async _expandEntriesOverSemester(
        baseEntries: ScheduleEntryDto[],
        semesterId: string,
      ): Promise<ScheduleEntryDto[]> {
        const sem = await this.prisma.semester.findUnique({ where: { id: semesterId } });
        if (!sem) throw new NotFoundException('Semestre introuvable');
      
        const start: Date = sem.startDate;
        // Ajuste automatiquement la date de fin si le semestre couvre S2 (février-juin)
        let end: Date   = sem.endDate;
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
          const delta = ((targetDow + 7) - (dowStart === 0 ? 7 : dowStart)) % 7; // écart jusqu'au prochain jour voulu
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
                  startTime: this._toIsoLocal(entryDate),
                  endTime:   this._toIsoLocal(entryDate),
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
                startTime: this._toIsoLocal(dtStart),
                endTime:   this._toIsoLocal(dtEnd),
              });
            }
  
            // Semaine suivante
            current.setDate(current.getDate() + 7);
          }
        }
  
        return result;
      }
  
    /**
     * Récupère la liste des vacances scolaires pour l'année donnée.
     * Si la version de date-holidays ne fournit pas getVacations(),
     * on retombe sur getHolidays() puis on filtre le type "school".
     */
    private _getVacations(year: number): { start: string; end: string }[] {
      return this.vacationsCache.get(year) ?? [];
    }
  
    /**
     * Charge (et met en cache) les vacances Zone C pour une année (2024-2026).
     * Source : ICS officiel https://fr.ftp.opendatasoft.com/openscol/fr-en-calendrier-scolaire/Zone-C.ics
     */
    private async _loadVacationsForYear(year: number) {
      // On limite explicitement aux années demandées afin d'éviter les appels
      // réseau inutiles et de conserver le comportement antérieur pour les
      // autres années.
      if (this.vacationsCache.has(year)) return;
      if (year < 2024 || year > 2026) {
        this.vacationsCache.set(year, []);
        return;
      }
  
      // Télécharge l'ICS Zone C une seule fois
      if (!this.icsData) {
        const icsUrl =
          'https://fr.ftp.opendatasoft.com/openscol/fr-en-calendrier-scolaire/Zone-C.ics';
        try {
          const res = await _fetch(icsUrl);
          if (!res.ok) throw new Error(`ICS fetch error ${res.status}`);
          this.icsData = await res.text();
        } catch (err) {
          console.error('Erreur chargement ICS vacances', err);
          // On mémorise quand même pour éviter de retenter à chaque appel
          this.icsData = '';
        }
      }
  
      const periods: { start: string; end: string }[] = [];
  
      if (this.icsData) {
        const vevents = this.icsData.split('BEGIN:VEVENT');
        for (const evRaw of vevents) {
          if (!evRaw.includes('SUMMARY:')) continue;
  
          const summaryMatch = evRaw.match(/SUMMARY:(.+)/);
          if (!summaryMatch) continue;
          const summary = summaryMatch[1].trim();
  
          // On retient uniquement les événements contenant « Vacances » ou « Pont »
          if (!/Vacances|Pont/i.test(summary)) continue;
  
          const dtStartMatch = evRaw.match(/DTSTART;VALUE=DATE:(\d{8})/);
          const dtEndMatch   = evRaw.match(/DTEND;VALUE=DATE:(\d{8})/);
          if (!dtStartMatch || !dtEndMatch) continue;
  
          const yStart = parseInt(dtStartMatch[1].substring(0, 4), 10);
          const yEnd   = parseInt(dtEndMatch[1].substring(0, 4), 10);
          // On inclut la période si elle recouvre l'année demandée
          if (yStart !== year && yEnd !== year) continue;
  
          const startStr = `${dtStartMatch[1].substring(0, 4)}-${dtStartMatch[1].substring(4, 6)}-${dtStartMatch[1].substring(6, 8)}`;
          // DTEND est exclusif dans le format iCal → on retranche un jour pour obtenir une date inclusive
          const endIso   = `${dtEndMatch[1].substring(0, 4)}-${dtEndMatch[1].substring(4, 6)}-${dtEndMatch[1].substring(6, 8)}`;
          const endDate  = new Date(endIso);
          endDate.setDate(endDate.getDate() - 1);
          const endStr   = endDate.toISOString().substring(0, 10);
  
          periods.push({ start: startStr, end: endStr });
        }
      }
  
      this.vacationsCache.set(year, periods);
    }
  
    /** Assure vacations chargées pour toutes les années du semestre */
    private async _ensureVacationsForSemester(semesterId: string) {
      const sem = await this.prisma.semester.findUnique({ where: { id: semesterId } });
      if (!sem) return;
      const years: number[] = [];
      const yStart = sem.startDate.getFullYear();
      const yEnd   = sem.endDate.getFullYear();
      for (let y = yStart; y <= yEnd; y++) years.push(y);
      for (const y of years) {
        await this._loadVacationsForYear(y);
      }
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
        return 'Vacances scolaire';
      }

      // Vacances scolaires Zone C
      const year = dNoon.getFullYear();
      const vacations = this._getVacations(year);
      const inVac = vacations.find(vac => {
        return dNoon >= this._atNoon(new Date(vac.start)) && dNoon <= this._atNoon(new Date(vac.end));
      });
      if (inVac) return 'Vacances scolaire';

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
      await this.prisma.$transaction(
        async tx => {
          // on supprime d'abord les lignes enfants, puis les entrées pour éviter la contrainte FK
          await tx.entryChild.deleteMany({
            where: { entry: { semesterId } },
          });
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
  
            if (e.children.length) {
              // insertion en bulk pour limiter le nombre de requêtes
              await tx.entryChild.createMany({
                data: e.children.map(c => ({ entryId: entry.id, childId: c.id })),
              });
            }
          }
        },
        {
          maxWait: 20_000, // attente max pour obtenir un slot
          timeout: 120_000, // 2 min pour exécuter toute la transaction (import potentiellement lourd)
        },
      );
  
      // 3) sauvegarde du fichier sur disque
      await fs.mkdir(this.uploadDir, { recursive: true });
      const fullPath = path.join(this.uploadDir, `${semesterId}.xlsx`);
      await fs.writeFile(fullPath, file.buffer);
    }

    /** Annule (ou réactive) un créneau : on préfixe le libellé par « Annulé – » */
    async cancelEntry(entryId: string, cancel = true) {
      const entry = await this.prisma.scheduleEntry.findUnique({ where: { id: entryId } });
      if (!entry) throw new NotFoundException('Créneau introuvable');

      const isAlreadyCanceled = entry.activity.startsWith('Annulé – ');
      if (cancel && isAlreadyCanceled) return entry;
      if (!cancel && !isAlreadyCanceled) return entry;

      const newActivity = cancel
        ? `Annulé – ${entry.activity}`
        : entry.activity.replace(/^Annulé – /, '');

      console.log('[cancelEntry]', { entryId, cancel })

      return this.prisma.scheduleEntry.update({
        where: { id: entryId },
        data: { activity: newActivity },
      });
    }

    /** Réaffecte tous les enfants d'un créneau source vers un créneau cible */
    async reassignChildren(sourceEntryId: string, targetEntryId: string) {
      if (sourceEntryId === targetEntryId) {
        throw new BadRequestException('Source et cible identiques');
      }

      console.log('[reassignChildren]', { sourceEntryId, targetEntryId })

      return this.prisma.$transaction(async tx => {
        // déplace les lignes EntryChild
        await tx.entryChild.updateMany({
          where: { entryId: sourceEntryId },
          data: { entryId: targetEntryId },
        });

        // on annule automatiquement le cours source s'il ne l'est pas déjà
        const src = await tx.scheduleEntry.findUnique({ where: { id: sourceEntryId } });
        if (src && !src.activity.startsWith('Annulé – ')) {
          await tx.scheduleEntry.update({
            where: { id: sourceEntryId },
            data: { activity: `Annulé – ${src.activity}` },
          });
        }

        console.log('[reassignChildren] moved children OK')

        return { moved: true };
      });
    }

    /** Déplace un enfant d'une entrée vers une autre */
    async reassignSingleChild(sourceEntryId: string, childId: number, targetEntryId: string) {
      if (sourceEntryId === targetEntryId) {
        throw new BadRequestException('Source et cible identiques');
      }
      return this.prisma.$transaction(async tx => {
        // vérifie que le lien existe
        const existing = await tx.entryChild.findFirst({ where: { entryId: sourceEntryId, childId } });
        if (!existing) throw new NotFoundException('Enfant non associé à ce créneau');

        // vérifie que le child n'est pas déjà dans la cible
        const dup = await tx.entryChild.findFirst({ where: { entryId: targetEntryId, childId } });
        if (dup) throw new BadRequestException('Enfant déjà dans le créneau cible');

        await tx.entryChild.deleteMany({ where: { entryId: sourceEntryId, childId } });
        await tx.entryChild.create({ data: { entryId: targetEntryId, childId } });

        console.log('[reassignSingleChild]', { sourceEntryId, childId, targetEntryId })

        return { moved: true };
      });
    }

    /**
     * Échappe les caractères HTML dangereux afin d'éviter toute injection XSS
     * quand le libellé d'activité est rendu dans le front.
     * On encode les cinq plus courants : & < > " '
     */
    private _sanitize(text: string): string {
      return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
    }
  }
  
  