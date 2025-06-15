import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JustifyAbsenceDto } from './dto/presence.dto';

@Injectable()
export class PresenceService {
  constructor(private readonly prisma: PrismaService) {}

  /* ───────────────────────────
   * 1. Création / récupération d’une feuille
   * ─────────────────────────── */
  async createSheet(dateString: string, staffId: string) {
    const date = new Date(dateString);

    /* 1) upsert de la feuille */
    const sheet = await this.prisma.presenceSheet.upsert({
      where : { date },
      create: { date, staffId, status: 'PENDING_STAFF' },
      update: {},
    });

    /* 2) si aucun record encore présent → on génère “absent” pour chaque enfant */
    const hasRecords = await this.prisma.presenceRecord.findFirst({
      where : { sheetId: sheet.id },
      select: { id: true },
    });

    if (!hasRecords) {
      const children = await this.prisma.child.findMany();
      await this.prisma.presenceRecord.createMany({
        data: children.map((c) => ({
          sheetId: sheet.id,
          childId: c.id,
          present: false,
        })),
      });
    }

    /* 3) retourne la feuille complète (records + enfant) */
    return this.prisma.presenceSheet.findUnique({
      where  : { id: sheet.id },
      include: { records: { include: { child: true } } },
    });
  }

  /* ───────────────────────────
   * 2. Validation par l’éducateur
   * ─────────────────────────── */
  async validateSheet(
    sheetId: number,
    presentChildIds: number[],
    staffId: string,
  ) {
    const sheet = await this.prisma.presenceSheet.findUnique({
      where: { id: sheetId },
    });
    if (!sheet) throw new NotFoundException('Feuille introuvable');
    if (sheet.status !== 'PENDING_STAFF') {
      throw new BadRequestException('Feuille non éligible à la validation');
    }

    /* met à jour les présences */
    const children   = await this.prisma.child.findMany();
    const presentSet = new Set(presentChildIds);

    await this.prisma.presenceRecord.deleteMany({ where: { sheetId } });
    await this.prisma.presenceRecord.createMany({
      data: children.map((child) => ({
        sheetId,
        childId: child.id,
        present: presentSet.has(child.id),
      })),
    });

    /* passe la feuille au statut suivant */
    return this.prisma.presenceSheet.update({
      where: { id: sheetId },
      data : {
        staffId,
        validatedAtStaff: new Date(),
        status: 'PENDING_SECRETARY',
      },
    });
  }

  /* ───────────────────────────
   * 3. Justification d’une absence
   * ─────────────────────────── */
  async justify(recordId: number, dto: JustifyAbsenceDto, filePath?: string) {
    const record = await this.prisma.presenceRecord.findUnique({
      where  : { id: recordId },
      include: { sheet: true },
    });
    if (!record) throw new NotFoundException('Enregistrement introuvable');
    if (record.present) {
      throw new BadRequestException('Impossible de justifier un présent');
    }

    await this.prisma.absenceJustification.create({
      data: {
        recordId,
        justificationDate: new Date(dto.justificationDate),
        motif : dto.motif,
        filePath: filePath ?? null,
      },
    });

    /* check s’il reste des absences non justifiées */
    const pending = await this.prisma.presenceRecord.count({
      where: { sheetId: record.sheetId, present: false, justification: null },
    });

    const updateData: any = { validatedBySecretary: pending === 0 };
    if (pending === 0) {
      updateData.validatedAtSecretary = new Date();
      updateData.status = 'VALIDATED';
    }

    return this.prisma.presenceSheet.update({
      where: { id: record.sheetId },
      data : updateData,
    });
  }

  /* ───────────────────────────
   * 4. Lecture d’une feuille par date
   * ─────────────────────────── */
  async findByDate(dateString: string) {
    const date = new Date(dateString);
    const sheet = await this.prisma.presenceSheet.findUnique({
      where  : { date },
      include: {
        records: { include: { child: true, justification: true } },
      },
    });
    if (!sheet) {
      throw new NotFoundException(
        `Feuille non trouvée pour la date ${dateString}`,
      );
    }
    return sheet;
  }
}
