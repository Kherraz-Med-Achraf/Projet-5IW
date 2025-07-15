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
  
    /**
     * Crée (ou récupère) la feuille de présence pour la date donnée.
     * Si aucun record n’existe encore, on génère un enregistrement
     * « absent » pour chaque enfant afin que l’éducateur voie la liste complète.
     */
    async createSheet(dateString: string, staffId: string) {
      const date = new Date(dateString);
  
      // 1) upsert de la feuille
      const sheet = await this.prisma.presenceSheet.upsert({
        where: { date },
        create: { date, staffId, status: 'PENDING_STAFF' },
        update: {},
      });
  
      // 2) si aucun record n’existe encore, on crée un record « absent » par enfant
      const hasRecords = await this.prisma.presenceRecord.findFirst({
        where: { sheetId: sheet.id },
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
  
      // 3) renvoyer la feuille complète avec les relations
      return this.prisma.presenceSheet.findUnique({
        where: { id: sheet.id },
        include: { records: { include: { child: true } } },
      });
    }
  
    /**
     * Validation par l'éducateur : met à jour la présence des enfants
     * puis passe la feuille au statut PENDING_SECRETARY.
     */
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
  
      // Met à jour les records en bloc : présents / absents
      const children = await this.prisma.child.findMany();
      const presentSet = new Set(presentChildIds);
  
      // 1) Supprimer les records actuels (plus simple que de patcher un par un)
      await this.prisma.presenceRecord.deleteMany({ where: { sheetId } });
  
      // 2) Recréer les records avec le bon booléen "present"
      await this.prisma.presenceRecord.createMany({
        data: children.map((child) => ({
          sheetId,
          childId: child.id,
          present: presentSet.has(child.id),
        })),
      });
  
      // 3) Mettre à jour la feuille
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
     * Saisie d'une justification par la secrétaire.
     * Le statut passe à VALIDATED lorsqu’il n’y a plus d’absence non justifiée.
     */
    async justify(recordId: number, dto: JustifyAbsenceDto, filePath?: string) {
      const record = await this.prisma.presenceRecord.findUnique({
        where: { id: recordId },
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
          motif: dto.motif,
          filePath: filePath ?? null,
        },
      });
  
      // Vérifie s’il reste des absences non justifiées
      const pendingCount = await this.prisma.presenceRecord.count({
        where: { sheetId: record.sheetId, present: false, justification: null },
      });
  
      const updateData: any = { validatedBySecretary: pendingCount === 0 };
      if (pendingCount === 0) {
        updateData.validatedAtSecretary = new Date();
        updateData.status = 'VALIDATED';
      }
  
      return this.prisma.presenceSheet.update({
        where: { id: record.sheetId },
        data: updateData,
      });
    }
  
    /**
     * Récupère la feuille + ses enregistrements pour une date donnée.
     */
    async findByDate(dateString: string) {
      const date = new Date(dateString);
      const sheet = await this.prisma.presenceSheet.findUnique({
        where: { date },
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
  