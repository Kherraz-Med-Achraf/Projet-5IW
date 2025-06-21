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
  
    // ... vos autres méthodes (1 à 8) inchangées ...
  
    /**
     * 9. Prévisualisation + validations globales
     */
    async previewExcel(
      file: Express.Multer.File,
      semesterId: string,
    ): Promise<ScheduleEntryDto[]> {
      const wb = XLSX.read(file.buffer, { type: 'buffer' });
      const sheetNames = wb.SheetNames;
  
      // Charger tous les STAFF en base
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
  
      // Charger tous les enfants en base
      const dbChildren = await this.prisma.child.findMany();
      const childKeys = dbChildren.map(c =>
        `${c.firstName} ${c.lastName}`.toLowerCase(),
      );
      const childSet = new Set(childKeys);
  
      // Préparer la couverture enfants par jour
      const coverage: Record<number, Record<string, { m: boolean; a: boolean }>> =
        {};
      for (let dow = 1; dow <= 5; dow++) {
        coverage[dow] = {};
        childKeys.forEach(cKey => (coverage[dow][cKey] = { m: false, a: false }));
      }
  
      const allEntries: ScheduleEntryDto[] = [];
  
      for (const sheetName of sheetNames) {
        const dow =
          ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'].indexOf(
            sheetName,
          ) + 1;
        if (!dow) continue;
  
        const sheet = wb.Sheets[sheetName];
        const rows: any[][] = XLSX.utils.sheet_to_json(sheet, {
          header: 1,
          blankrows: false,
        });
  
        // Lignes staff à partir de la 2ᵉ
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          const rawName = (row[0] || '').toString().trim();
          if (!rawName) continue;
          const staffKey = rawName.toLowerCase();
          const staffId = nameToId.get(staffKey);
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
  
            // on découpe obligatoirement en [activité, enfants]
            const parts = cell.split('–').map(s => s.trim());
            if (parts.length !== 2 || !parts[0]) {
              throw new BadRequestException(
                `Format invalide [Activité – Enfants] dans ${sheetName}, ligne ${
                  i + 1
                }, colonne ${idx + 1}`,
              );
            }
            const [act, namesPart] = parts;
  
            // on découpe les noms et on filtre les chaînes vides
            let rawChildren = namesPart
              .split(',')
              .map(s => s.trim())
              .filter(s => s.length > 0);
            if (rawChildren.length === 0) {
              throw new BadRequestException(
                `Aucun enfant indiqué dans ${sheetName}, ligne ${
                  i + 1
                }, colonne ${idx + 1}`,
              );
            }
  
            // cas spécial "tous"
            const lowerChildren = rawChildren.map(s => s.toLowerCase());
            let childrenNames: string[];
            if (lowerChildren.includes('tous')) {
              childrenNames = [...childKeys];
            } else {
              childrenNames = lowerChildren;
            }
  
            // validation enfants
            childrenNames.forEach(cn => {
              if (!childSet.has(cn)) {
                throw new BadRequestException(`Enfant introuvable : "${cn}"`);
              }
            });
  
            // bloc matin/après-midi
            const block = idx <= 3 ? 'morning' : 'afternoon';
            childrenNames.forEach(cn => {
              coverage[dow][cn][block === 'morning' ? 'm' : 'a'] = true;
            });
  
            // horaire par créneau
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
  
      // 2) vérifier tous les staff
      const missingStaff = dbStaff
        .map(u => u.id)
        .filter(id => !seenStaff.has(id));
      if (missingStaff.length) {
        throw new BadRequestException(
          `Onglets Excel incomplets, manquent ${missingStaff.length} éducateur(s)`,
        );
      }
  
      // 3) couverture enfants
      const errors: string[] = [];
      for (let dow = 1; dow <= 5; dow++) {
        childKeys.forEach(cn => {
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
        });
      }
      if (errors.length) {
        throw new BadRequestException({
          message: 'Planning incomplet pour un ou plusieurs enfants',
          details: errors,
        });
      }
  
      return allEntries;
    }
  
    /**
     * 10. Import définitif : après validation, persiste et sauvegarde fichier
     */
    async importExcel(
      file: Express.Multer.File,
      semesterId: string,
    ): Promise<void> {
      // 10a. Validation + extraction
      const entries = await this.previewExcel(file, semesterId);
  
      // 10b. Sauvegarde du fichier sur disque
      await fs.mkdir(this.uploadDir, { recursive: true });
      await fs.writeFile(path.join(this.uploadDir, `${semesterId}.xlsx`), file.buffer);
  
      // 10c. Transaction DB
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
    }
  
    // ... parseTime et mapToDto inchangés ...
  }
  