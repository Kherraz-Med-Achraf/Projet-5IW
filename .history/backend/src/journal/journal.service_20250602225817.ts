// src/journal/journal.service.ts
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Journal, Prisma } from '@prisma/client';

@Injectable()
export class JournalService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Récupère tous les journaux d’un enfant pour une année scolaire donnée.
   */
  async findByChildAndYear(childId: number, academicYearId: number): Promise<Journal[]> {
    return this.prisma.journal.findMany({
      where: {
        childId,
        academicYearId,
      },
      orderBy: { month: 'asc' },
      include: {
        attachments: true,
      },
    });
  }

  /**
   * Crée un journal (brouillon) pour un mois donné.
   */
  async create(data: Prisma.JournalCreateInput): Promise<Journal> {
    return this.prisma.journal.create({ data });
  }

  /**
   * Met à jour le contenu ou la progression d’un journal (tant qu’il n’est pas soumis).
   */
  async update(journalId: number, data: Prisma.JournalUpdateInput): Promise<Journal> {
    const existing = await this.prisma.journal.findUnique({ where: { id: journalId } });
    if (!existing) throw new NotFoundException(`Journal ${journalId} introuvable`);
    if (existing.isSubmitted) {
      throw new ForbiddenException(`Le journal ${journalId} a déjà été soumis et ne peut plus être modifié`);
    }
    return this.prisma.journal.update({ where: { id: journalId }, data });
  }

  /**
   * Soumet définitivement un journal (passer isSubmitted à true + horodatage).
   */
  async submit(journalId: number): Promise<Journal> {
    const existing = await this.prisma.journal.findUnique({ where: { id: journalId } });
    if (!existing) throw new NotFoundException(`Journal ${journalId} introuvable`);
    if (existing.isSubmitted) {
      throw new ForbiddenException(`Le journal ${journalId} est déjà soumis`);
    }
    return this.prisma.journal.update({
      where: { id: journalId },
      data: { isSubmitted: true, submittedAt: new Date() },
    });
  }

  /**
   * Réouvre un journal soumis (réinitialiser isSubmitted à false).
   * N’autoriser que le rôle ADMIN (voir RolesGuard).
   */
  async reopen(journalId: number): Promise<Journal> {
    const existing = await this.prisma.journal.findUnique({ where: { id: journalId } });
    if (!existing) throw new NotFoundException(`Journal ${journalId} introuvable`);
    if (!existing.isSubmitted) {
      throw new ForbiddenException(`Le journal ${journalId} n’est pas soumis`);
    }
    return this.prisma.journal.update({
      where: { id: journalId },
      data: { isSubmitted: false },
    });
  }

  /**
   * Supprime un journal (et ses pièces jointes, si vous avez mis en cascade dans Prisma).
   * Optionnel : à appeler si l’enfant est supprimé (cascade).
   */
  async remove(journalId: number): Promise<Journal> {
    const existing = await this.prisma.journal.findUnique({ where: { id: journalId } });
    if (!existing) throw new NotFoundException(`Journal ${journalId} introuvable`);
    return this.prisma.journal.delete({ where: { id: journalId } });
  }

  /**
   * Ajoute une pièce jointe pour un journal (via multer/UploadFile dans le controller).
   */
  async addAttachment(journalId: number, filename: string, filepath: string) {
    // On vérifie d’abord que le journal existe
    const existing = await this.prisma.journal.findUnique({ where: { id: journalId } });
    if (!existing) throw new NotFoundException(`Journal ${journalId} introuvable`);
    return this.prisma.attachment.create({
      data: {
        journal: { connect: { id: journalId } },
        filename,
        filepath,
      },
    });
  }

  /**
   * Supprime une pièce jointe par son ID.
   */
  async removeAttachment(attachmentId: number) {
    const existing = await this.prisma.attachment.findUnique({ where: { id: attachmentId } });
    if (!existing) throw new NotFoundException(`Pièce jointe ${attachmentId} introuvable`);
    return this.prisma.attachment.delete({ where: { id: attachmentId } });
  }
}
