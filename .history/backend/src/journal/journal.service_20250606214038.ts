// src/journal/journal.service.ts

import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JournalMensuel, JournalAttachment, Prisma } from '@prisma/client';
import { promises as fs } from 'fs';
import { join } from 'path';

@Injectable()
export class JournalService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Vérifie qu’un enfant appartient bien au parent donné.
   * Retourne true si parentUserId est bien le parent de childId.
   */
  async verifyChildBelongsToParent(
    childId: number,
    parentUserId: string,
  ): Promise<boolean> {
    // Récupère l’id du parentProfile lié à cet enfant
    const child = await this.prisma.child.findUnique({
      where: { id: childId },
      select: { parentProfileId: true },
    });
    if (!child) return false;

    // Récupère le parentProfile pour parentUserId
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
  async create(data: Prisma.JournalMensuelCreateInput): Promise<JournalMensuel> {
    return this.prisma.journalMensuel.create({ data });
  }

  /**
   * Met à jour le contenu ou la progression d’un journal (tant qu’il n’est pas soumis).
   */
  async update(
    journalId: number,
    data: Prisma.JournalMensuelUpdateInput,
  ): Promise<JournalMensuel> {
    const existing = await this.prisma.journalMensuel.findUnique({
      where: { id: journalId },
    });
    if (!existing) {
      throw new NotFoundException(`Journal ${journalId} introuvable`);
    }
    if (existing.isSubmitted) {
      throw new ForbiddenException(
        `Le journal ${journalId} a déjà été soumis et ne peut plus être modifié`,
      );
    }
    return this.prisma.journalMensuel.update({
      where: { id: journalId },
      data,
    });
  }

  /**
   * Soumet définitivement un journal (passer isSubmitted à true + horodatage).
   * Avant soumission, on vérifie que des missions annuelles existent pour cet enfant et cette année.
   */
  async submit(journalId: number): Promise<JournalMensuel> {
    const existing = await this.prisma.journalMensuel.findUnique({
      where: { id: journalId },
    });
    if (!existing) {
      throw new NotFoundException(`Journal ${journalId} introuvable`);
    }
    if (existing.isSubmitted) {
      throw new ForbiddenException(`Le journal ${journalId} est déjà soumis`);
    }

    // Vérifier que l’enfant a bien des missions pour cette année scolaire
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
   * N’autoriser que le rôle ADMIN (voir RolesGuard).
   */
  async reopen(journalId: number): Promise<JournalMensuel> {
    const existing = await this.prisma.journalMensuel.findUnique({
      where: { id: journalId },
    });
    if (!existing) {
      throw new NotFoundException(`Journal ${journalId} introuvable`);
    }
    if (!existing.isSubmitted) {
      throw new ForbiddenException(`Le journal ${journalId} n’est pas soumis`);
    }
    return this.prisma.journalMensuel.update({
      where: { id: journalId },
      data: { isSubmitted: false },
    });
  }

  /**
   * Supprime un journal (et ses pièces jointes, en cascade).
   */
  async remove(journalId: number): Promise<JournalMensuel> {
    const existing = await this.prisma.journalMensuel.findUnique({
      where: { id: journalId },
    });
    if (!existing) {
      throw new NotFoundException(`Journal ${journalId} introuvable`);
    }
    return this.prisma.journalMensuel.delete({ where: { id: journalId } });
  }

  /**
   * Ajoute une pièce jointe pour un journal (via multer/UploadFile dans le controller).
   */
  async addAttachment(
    journalId: number,
    filename: string,
    filepath: string,
  ): Promise<JournalAttachment> {
    const existing = await this.prisma.journalMensuel.findUnique({
      where: { id: journalId },
    });
    if (!existing) {
      throw new NotFoundException(`Journal ${journalId} introuvable`);
    }
    return this.prisma.journalAttachment.create({
      data: {
        journal: { connect: { id: journalId } },
        filename,
        filepath,
      },
    });
  }

  /**
   * Supprime une pièce jointe par son ID et efface le fichier sur le disque.
   */
  async removeAttachment(attachmentId: number): Promise<JournalAttachment> {
    // 1) On récupère l’entrée pour obtenir le nom de fichier stocké
    const existing = await this.prisma.journalAttachment.findUnique({
      where: { id: attachmentId },
    });
    if (!existing) {
      throw new NotFoundException(`Pièce jointe ${attachmentId} introuvable`);
    }

    // 2) On supprime physiquement le fichier du dossier uploads
    const filePathOnDisk = join(process.cwd(), 'uploads', existing.filename);
    try {
      await fs.unlink(filePathOnDisk);
    } catch (err) {
      // Si le fichier n’existe déjà plus, on ignore l’erreur
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw err;
      }
    }

    // 3) Puis on supprime l’enregistrement en base
    return this.prisma.journalAttachment.delete({ where: { id: attachmentId } });
  }
}
