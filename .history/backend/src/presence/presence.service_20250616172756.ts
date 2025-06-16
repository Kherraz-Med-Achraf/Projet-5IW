// src/presence/presence.service.ts

import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JustifyAbsenceDto, JustificationType } from './dto/presence.dto';

@Injectable()
export class PresenceService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Aplatit la feuille avec records, en extrayant child.parentProfile.phone → child.parentPhone
   */
  private mapSheet(raw: any) {
    if (!raw) return null;

    return {
      id: raw.id,
      date: raw.date,
      status: raw.status,
      validatedAtStaff: raw.validatedAtStaff,
      validatedAtSecretary: raw.validatedAtSecretary,
      staff: raw.staff, // { staffProfile: { firstName, lastName } }
      records: raw.records.map((r: any) => ({
        id: r.id,
        present: r.present,
        justification: r.justification,
        child: {
          id: r.child.id,
          firstName: r.child.firstName,
          lastName: r.child.lastName,
          birthDate: r.child.birthDate,
          parentProfileId: r.child.parentProfileId,
          parentPhone: r.child.parentProfile?.phone ?? null,
        },
      })),
    };
  }

  /* 1. Création / récupération d’une feuille */
  async createSheet(dateString: string, staffId: string) {
    const date = new Date(dateString);

    // Upsert de la feuille
    const sheetUpsert = await this.prisma.presenceSheet.upsert({
      where: { date },
      create: { date, staffId, status: 'PENDING_STAFF' },
      update: {},
    });

    // Génération des records s’ils n’existent pas
    const has = await this.prisma.presenceRecord.findFirst({
      where: { sheetId: sheetUpsert.id },
      select: { id: true },
    });
    if (!has) {
      const children = await this.prisma.child.findMany();
      await this.prisma.presenceRecord.createMany({
        data: children.map(c => ({
          sheetId: sheetUpsert.id,
          childId: c.id,
          present: false,
        })),
      });
    }

    // Requête avec include parentProfile.phone
    const raw = (await this.prisma.presenceSheet.findUnique({
      where: { id: sheetUpsert.id },
      include: {
        records: {
          include: {
            child: {
              include: {
                parentProfile: { select: { phone: true } },
              },
            },
            justification: true,
          },
        },
        staff: { select: { staffProfile: { select: { firstName: true, lastName: true } } } },
      },
    })) as any;

    return this.mapSheet(raw);
  }

  /* 2. Validation par l’éducateur */
  async validateSheet(
    sheetId: number,
    presentChildIds: number[],
    staffId: string,
  ) {
    const sheet = await this.prisma.presenceSheet.findUnique({ where: { id: sheetId } });
    if (!sheet) throw new NotFoundException('Feuille introuvable');
    if (sheet.status !== 'PENDING_STAFF')
      throw new BadRequestException('Feuille non éligible à la validation');

    // On supprime / recrée tous les records
    const children = await this.prisma.child.findMany();
    const setPresent = new Set(presentChildIds);
    await this.prisma.presenceRecord.deleteMany({ where: { sheetId } });
    await this.prisma.presenceRecord.createMany({
      data: children.map(ch => ({
        sheetId,
        childId: ch.id,
        present: setPresent.has(ch.id),
      })),
    });

    const raw = (await this.prisma.presenceSheet.update({
      where: { id: sheetId },
      data: {
        staffId,
        validatedAtStaff: new Date(),
        status: 'PENDING_SECRETARY',
      },
      include: {
        records: {
          include: {
            child: {
              include: {
                parentProfile: { select: { phone: true } },
              },
            },
            justification: true,
          },
        },
        staff: { select: { staffProfile: { select: { firstName: true, lastName: true } } } },
      },
    })) as any;

    return this.mapSheet(raw);
  }

  /* 3. Justification d’une absence ou d’un retard */
  async justify(recordId: number, dto: JustifyAbsenceDto, filePath?: string) {
    const rec = await this.prisma.presenceRecord.findUnique({
      where: { id: recordId },
      include: { sheet: true },
    });
    if (!rec) throw new NotFoundException('Enregistrement introuvable');
    if (rec.present) throw new BadRequestException('Impossible de justifier un présent');

    const motifValue =
      dto.motif ?? (dto.type === JustificationType.LATENESS ? 'Retard justifié' : '');

    await this.prisma.absenceJustification.create({
      data: {
        recordId,
        type: dto.type,
        justificationDate: new Date(dto.justificationDate),
        motif: motifValue,
        filePath: filePath ?? null,
      },
    });

    // Si plus d’absences non justifiées → passe au statut VALIDATED
    const pending = await this.prisma.presenceRecord.count({
      where: {
        sheetId: rec.sheetId,
        present: false,
        justification: null,
      },
    });
    const updateData: any = { validatedBySecretary: pending === 0 };
    if (pending === 0) {
      updateData.validatedAtSecretary = new Date();
      updateData.status = 'VALIDATED';
    }

    const raw = (await this.prisma.presenceSheet.update({
      where: { id: rec.sheetId },
      data: updateData,
      include: {
        records: {
          include: {
            child: {
              include: {
                parentProfile: { select: { phone: true } },
              },
            },
            justification: true,
          },
        },
        staff: { select: { staffProfile: { select: { firstName: true, lastName: true } } } },
      },
    })) as any;

    return this.mapSheet(raw);
  }

  /* 4. Lecture d’une feuille par date */
  async findByDate(dateString: string) {
    const date = new Date(dateString);
    const raw = (await this.prisma.presenceSheet.findUnique({
      where: { date },
      include: {
        records: {
          include: {
            child: {
              include: {
                parentProfile: { select: { phone: true } },
              },
            },
            justification: true,
          },
        },
        staff: { select: { staffProfile: { select: { firstName: true, lastName: true } } } },
      },
    })) as any;

    if (!raw) throw new NotFoundException(`Feuille non trouvée pour la date ${dateString}`);
    return this.mapSheet(raw);
  }
}
