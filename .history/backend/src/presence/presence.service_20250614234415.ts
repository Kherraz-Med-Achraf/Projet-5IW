import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JustifyAbsenceDto } from './dto/presence.dto';

@Injectable()
export class PresenceService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Crée ou récupère une feuille de présence pour une date donnée
   */
  async createSheet(dateString: string) {
    const date = new Date(dateString);
    return this.prisma.presenceSheet.upsert({
      where: { date },
      create: { date },
      update: {},
      include: { records: true },
    });
  }

  /**
   * Validation par l'éducateur : création des enregistrements et passage au statut PENDING_SECRETARY
   */
  async validateSheet(sheetId: number, presentChildIds: number[], staffId: string) {
    const sheet = await this.prisma.presenceSheet.findUnique({ where: { id: sheetId } });
    if (!sheet) throw new NotFoundException('Feuille introuvable');
    if (sheet.status !== 'PENDING_STAFF') {
      throw new BadRequestException('Feuille non éligible à la validation');
    }

    // Récupérer tous les enfants et créer les records
    const children = await this.prisma.child.findMany();
    const presentSet = new Set(presentChildIds);
    const recordsData = children.map(child => ({
      sheetId,
      childId: child.id,
      present: presentSet.has(child.id),
    }));
    await this.prisma.presenceRecord.createMany({ data: recordsData, skipDuplicates: true });

    // Mettre à jour le statut de la feuille
    return this.prisma.presenceSheet.update({
      where: { id: sheetId },
      data: {
        staffId,
        validatedAtStaff: new Date(),
        status: 'PENDING_SECRETARY',
      },
    });
  }

  /**
   * Saisie d'une justification par la secrétaire
   */
  async justify(recordId: number, dto: JustifyAbsenceDto, filePath?: string) {
    const record = await this.prisma.presenceRecord.findUnique({
      where: { id: recordId }, include: { sheet: true }
    });
    if (!record) throw new NotFoundException('Enregistrement introuvable');
    if (record.present) {
      throw new BadRequestException('Impossible de justifier un enregistrement présent');
    }

    // Créer la justification
    await this.prisma.absenceJustification.create({
      data: {
        recordId,
        justificationDate: new Date(dto.justificationDate),
        motif: dto.motif,
        filePath: filePath || null,
      },
    });

    // Vérifier si des absences restent non justifiées
    const pendingCount = await this.prisma.presenceRecord.count({
      where: { sheetId: record.sheetId, present: false, justification: null }
    });
    const updateData: any = { validatedBySecretary: pendingCount === 0 };
    if (pendingCount === 0) {
      updateData.validatedAtSecretary = new Date();
      updateData.status = 'VALIDATED';
    }

    // Mettre à jour la feuille
    return this.prisma.presenceSheet.update({
      where: { id: record.sheetId },
      data: updateData,
    });
  }

  /**
   * Récupère la feuille et ses enregistrements pour une date donnée
   */
  async findByDate(dateString: string) {
    const date = new Date(dateString);
    const sheet = await this.prisma.presenceSheet.findUnique({
      where: { date },
      include: {
        records: { include: { child: true, justification: true } }
      },
    });
    if (!sheet) {
      throw new NotFoundException(`Feuille non trouvée pour la date ${dateString}`);
    }
    return sheet;
  }
}
