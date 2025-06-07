// src/journal/journal.service.ts
import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JournalMensuel, JournalAttachment } from '@prisma/client';
import { promises as fs } from 'fs';
import { join } from 'path';

@Injectable()
export class JournalService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Récupère toutes les entrées de journal pour un mois donné (format 'YYYY-MM').
   */
  async findByMonth(monthStr: string): Promise<JournalMensuel[]> {
    const [year, month] = monthStr.split('-').map(Number);
    if (!year || !month || month < 1 || month > 12) {
      throw new BadRequestException(`Paramètre month invalide: ${monthStr}`);
    }

    // Trouve l'année académique correspondant à ce mois
    const referenceDate = new Date(year, month - 1, 1);
    const academicYear = await this.prisma.academicYear.findFirst({
      where: {
        startDate: { lte: referenceDate },
        endDate:   { gte: referenceDate },
      },
    });
    if (!academicYear) {
      throw new NotFoundException(`Aucune année académique trouvée pour ${monthStr}`);
    }

    return this.prisma.journalMensuel.findMany({
      where: {
        month,
        academicYearId: academicYear.id,
      },
      orderBy: { month: 'asc' },
      include: { attachments: true },
    });
  }

  /**
   * Vérifie qu’un enfant appartient bien au parent donné.
   */
  async verifyChildBelongsToParent(
    childId: number,
    parentUserId: string,
  ): Promise<boolean> {
    const child = await this.prisma.child.findUnique({
      where: { id: childId },
      select: { parentProfileId: true },
    });
    if (!child) return false;

    const parentProfile = await this.prisma.parentProfile.findUnique({
      where: { userId: parentUserId },
      select: { id: true },
    });
    if (!parentProfile) return false;

    return parentProfile.id === child.parentProfileId;
  }

  /**
   * Récupère tous les journaux d’un enfant pour une année scolaire donnée.
   */
  async findByChildAndYear(
    childId: number,
    academicYearId: number,
  ): Promise<JournalMensuel[]> {
    return this.prisma.journalMensuel.findMany({
      where: { childId, academicYearId },
      orderBy: { month: 'asc' },
      include: { attachments: true },
    });
  }

  /**
   * Récupère un journal par son ID (utilisé pour vérification d’existence).
   */
  async findOneById(journalId: number): Promise<JournalMensuel | null> {
    return this.prisma.journalMensuel.findUnique({ where: { id: journalId } });
  }

  /**
   * Compte le nombre de pièces jointes pour un journal donné.
   */
  async countAttachments(journalId: number): Promise<number> {
    return this.prisma.journalAttachment.count({ where: { journalId } });
  }

  /**
   * Crée un journal (brouillon) pour un mois donné.
   */
  async create(data: Parameters<PrismaService['journalMensuel']['create']>[0]['data']): Promise<JournalMensuel> {
    return this.prisma.journalMensuel.create({ data });
  }

  /**
   * Met à jour le contenu ou la progression d’un journal (tant qu’il n’est pas soumis).
   */
  async update(
    journalId: number,
    data: Parameters<PrismaService['journalMensuel']['update']>[0]['data'],
  ): Promise<JournalMensuel> {
    const existing = await this.prisma.journalMensuel.findUnique({ where: { id: journalId } });
    if (!existing) {
      throw new NotFoundException(`Journal ${journalId} introuvable`);
    }
    if (existing.isSubmitted) {
      throw new ForbiddenException(
        `Le journal ${journalId} a déjà été soumis et ne peut plus être modifié`,
      );
    }
    return this.prisma.journalMensuel.update({ where: { id: journalId }, data });
  }

  /**
   * Soumet définitivement un journal (passer isSubmitted à true + horodatage).
   */
  async submit(journalId: number): Promise<JournalMensuel> {
    const existing = await this.prisma.journalMensuel.findUnique({ where: { id: journalId } });
    if (!existing) throw new NotFoundException(`Journal ${journalId} introuvable`);
    if (existing.isSubmitted) throw new ForbiddenException(`Le journal ${journalId} est déjà soumis`);

    const missionCount = await this.prisma.mission.count({
      where: {
        childId: existing.childId,
        academicYearId: existing.academicYearId,
      },
    });
    if (missionCount === 0) {
      throw new BadRequestException(
        `Impossible de soumettre : aucune mission annuelle n'est renseignée pour cet enfant cette année`,
      );
    }

    return this.prisma.journalMensuel.update({
      where: { id: journalId },
      data: { isSubmitted: true, submittedAt: new Date() },
    });
  }

  /**
   * Réouvre un journal soumis (réinitialiser isSubmitted à false).
   */
  async reopen(journalId: number): Promise<JournalMensuel> {
    const existing = await this.prisma.journalMensuel.findUnique({ where: { id: journalId } });
    if (!existing) throw new NotFoundException(`Journal ${journalId} introuvable`);
    if (!existing.isSubmitted) throw new ForbiddenException(`Le journal ${journalId} n’est pas soumis`);
    return this.prisma.journalMensuel.update({ where: { id: journalId }, data: { isSubmitted: false } });
  }

  /**
   * Supprime un journal (et ses pièces jointes, en cascade).
   */
  async remove(journalId: number): Promise<JournalMensuel> {
    const existing = await this.prisma.journalMensuel.findUnique({ where: { id: journalId } });
    if (!existing) throw new NotFoundException(`Journal ${journalId} introuvable`);
    return this.prisma.journalMensuel.delete({ where: { id: journalId } });
  }

  /**
   * Ajoute une pièce jointe pour un journal.
   */
  async addAttachment(
    journalId: number,
    filename: string,
    filepath: string,
  ): Promise<JournalAttachment> {
    const existing = await this.prisma.journalMensuel.findUnique({ where: { id: journalId } });
    if (!existing) throw new NotFoundException(`Journal ${journalId} introuvable`);
    return this.prisma.journalAttachment.create({ data: { journal: { connect: { id: journalId } }, filename, filepath } });
  }

  /**
   * Supprime une pièce jointe par son ID et efface le fichier sur le disque.
   */
  async removeAttachment(attachmentId: number): Promise<JournalAttachment> {
    const existing = await this.prisma.journalAttachment.findUnique({ where: { id: attachmentId } });
    if (!existing) throw new NotFoundException(`Pièce jointe ${attachmentId} introuvable`);
    const filePathOnDisk = join(process.cwd(), 'uploads', existing.filename);
    try {
      await fs.unlink(filePathOnDisk);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
    }
    return this.prisma.journalAttachment.delete({ where: { id: attachmentId } });
  }
}
