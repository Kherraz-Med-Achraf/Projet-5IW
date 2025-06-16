// src/presence/presence.service.ts

import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JustifyAbsenceDto, JustificationType } from './dto/presence.dto';

type RawSheet = Awaited<ReturnType<PrismaService['presenceSheet']['findUnique']>>;

@Injectable()
export class PresenceService {
  constructor(private readonly prisma: PrismaService) {}

  /** Mapper le parentPhone et aplatir la structure child */
  private mapSheet(raw: RawSheet) {
    if (!raw) return null;

    return {
      id: raw.id,
      date: raw.date,
      staff: raw.staff,
      validatedAtStaff: raw.validatedAtStaff,
      validatedAtSecretary: raw.validatedAtSecretary,
      status: raw.status,
      records: raw.records.map(r => ({
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

    const sheetUpsert = await this.prisma.presenceSheet.upsert({
      where: { date },
      create: { date, staffId, status: 'PENDING_STAFF' },
      update: {},
    });

    const hasRecords = await this.prisma.presenceRecord.findFirst({
      where: { sheetId: sheetUpsert.id },
      select: { id: true },
    });
    if (!hasRecords) {
      const children = await this.prisma.child.findMany();
      await this.prisma.presenceRecord.createMany({
        data: children.map(c => ({
          sheetId: sheetUpsert.id,
          childId: c.id,
          present: false,
        })),
      });
    }

    const raw = await this.prisma.presenceSheet.findUnique({
      where: { id: sheetUpsert.id },
      include: {
        records: {
          include: {
            child: { include: { parentProfile: { select: { phone: true } } } },
            justification: true,
          },
        },
        staff: { select: { staffProfile: { select: { firstName: true, lastName: true } } } },
      },
    });

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

    const children = await this.prisma.child.findMany();
    const presentSet = new Set(presentChildIds);
    await this.prisma.presenceRecord.deleteMany({ where: { sheetId } });
    await this.prisma.presenceRecord.createMany({
      data: children.map(child => ({
        sheetId,
        childId: child.id,
        present: presentSet.has(child.id),
      })),
    });

    const raw = await this.prisma.presenceSheet.update({
      where: { id: sheetId },
      data: {
        staffId,
        validatedAtStaff: new Date(),
        status: 'PENDING_SECRETARY',
      },
      include: {
        records: {
          include: {
            child: { include: { parentProfile: { select: { phone: true } } } },
            justification: true,
          },
        },
        staff: { select: { staffProfile: { select: { firstName: true, lastName: true } } } },
      },
    });

    return this.mapSheet(raw);
  }

  /* 3. Justification d’une absence ou d’un retard */
  async justify(recordId: number, dto: JustifyAbsenceDto, filePath?: string) {
    const record = await this.prisma.presenceRecord.findUnique({
      where: { id: recordId },
      include: { sheet: true },
    });
    if (!record) throw new NotFoundException('Enregistrement introuvable');
    if (record.present) throw new BadRequestException('Impossible de justifier un présent');

    const motifValue =
      dto.motif ??
      (dto.type === JustificationType.LATENESS ? 'Retard justifié' : '');

    await this.prisma.absenceJustification.create({
      data: {
        recordId,
        type: dto.type,
        justificationDate: new Date(dto.justificationDate),
        motif: motifValue,
        filePath: filePath ?? null,
      },
    });

    const pending = await this.prisma.presenceRecord.count({
      where: {
        sheetId: record.sheetId,
        present: false,
        justification: null,
      },
    });

    const updateData: any = { validatedBySecretary: pending === 0 };
    if (pending === 0) {
      updateData.validatedAtSecretary = new Date();
      updateData.status = 'VALIDATED';
    }

    const raw = await this.prisma.presenceSheet.update({
      where: { id: record.sheetId },
      data: updateData,
      include: {
        records: {
          include: {
            child: { include: { parentProfile: { select: { phone: true } } } },
            justification: true,
          },
        },
        staff: { select: { staffProfile: { select: { firstName: true, lastName: true } } } },
      },
    });

    return this.mapSheet(raw);
  }

  /* 4. Lecture d’une feuille par date */
  async findByDate(dateString: string) {
    const date = new Date(dateString);
    const raw = await this.prisma.presenceSheet.findUnique({
      where: { date },
      include: {
        records: {
          include: {
            child: { include: { parentProfile: { select: { phone: true } } } },
            justification: true,
          },
        },
        staff: { select: { staffProfile: { select: { firstName: true, lastName: true } } } },
      },
    });
    if (!raw) throw new NotFoundException(`Feuille non trouvée pour la date ${dateString}`);
    return this.mapSheet(raw);
  }
}
