import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePresenceSheetDto, ValidateSheetDto, JustifyAbsenceDto } from './dto/presence.dto';

@Injectable()
export class PresenceService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Crée une feuille de présence pour une date donnée (si elle n'existe pas déjà)
   */
  async createSheet(dto: CreatePresenceSheetDto) {
    const date = new Date(dto.date);
    // ignore weekends/holidays can be handled at requête front
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
  async validateSheet(sheetId: number, dto: ValidateSheetDto, userId: string) {
    const sheet = await this.prisma.presenceSheet.findUnique({ where: { id: sheetId } });
    if (!sheet) throw new NotFoundException('Feuille introuvable');
    if (sheet.status !== 'PENDING_STAFF') throw new BadRequestException('Feuille déjà validée ou en cours de traitement');

    // Récupérer tous les enfants
    const children = await this.prisma.child.findMany();
    const presentSet = new Set(dto.presentChildIds);
    const records = children.map((child) => ({
      sheetId,
      childId: child.id,
      present: presentSet.has(child.id),
    }));

    // Créer tous les presenceRecords
    await this.prisma.presenceRecord.createMany({
      data: records,
      skipDuplicates: true,
    });

    // Mettre à jour la feuille
    return this.prisma.presenceSheet.update({
      where: { id: sheetId },
      data: {
        staffId: userId,
        validatedAtStaff: new Date(),
        status: 'PENDING_SECRETARY',
      },
    });
  }

  /**
   * Saisie d'une justification par la secrétaire
   */
  async justify(recordId: number, dto: JustifyAbsenceDto, filePath?: string) {
    const record = await this.prisma.presenceRecord.findUnique({ where: { id: recordId }, include: { sheet: true } });
    if (!record) throw new NotFoundException('Enregistrement de présence introuvable');
    if (record.present) throw new BadRequestException('Impossible de justifier un enfant marqué présent');

    // Créer la justification
    await this.prisma.absenceJustification.create({
      data: {
        recordId,
        justificationDate: new Date(dto.justificationDate),
        motif: dto.motif,
        filePath: filePath || null,
      },
    });

    // Vérifier si toutes les absences ont été justifiées
    const pending = await this.prisma.presenceRecord.count({
      where: { sheetId: record.sheetId, present: false, justification: null },
    });

    const updateData: any = { validatedBySecretary: pending === 0 };
    if (pending === 0) {
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
        records: {
          include: { child: true, justification: true },
        },
      },
    });
    if (!sheet) throw new NotFoundException('Feuille non trouvée pour cette date');
    return sheet;
  }
}
