import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PresenceCron {
  constructor(private readonly prisma: PrismaService) {}

  /** Tous les jours à 06 h 00 (Europe/Paris) */
  @Cron('0 6 * * *', { timeZone: 'Europe/Paris' })
  async preCreateSheet() {
    const today = new Date().toISOString().substring(0, 10);

    // 1) ne rien faire si la feuille existe déjà
    const exists = await this.prisma.presenceSheet.findUnique({
      where: { date: today },
    });
    if (exists) return;

    // 2) crée la feuille avec un staffId « SYSTEM »
    const sheet = await this.prisma.presenceSheet.create({
      data: {
        date: today,
        staffId: 'SYSTEM',       // champ requis dans ton schéma
        status: 'PENDING_STAFF',
      },
    });

    // 3) ajoute un enregistrement « absent » pour chaque enfant
    const children = await this.prisma.child.findMany();
    await this.prisma.presenceRecord.createMany({
      data: children.map((c) => ({
        sheetId: sheet.id,
        childId: c.id,
        present: false,
      })),
    });
  }
}
