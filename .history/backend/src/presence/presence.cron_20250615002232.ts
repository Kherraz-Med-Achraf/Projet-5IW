import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';          // ✅ paquet installé
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PresenceCron {
  constructor(private prisma: PrismaService) {}

  /** Tous les jours ouvrés à 06 h 00 (Europe/Paris) */
  @Cron('0 6 * * 1-5', { timeZone: 'Europe/Paris' })
  async preCreateSheet() {
    const today = new Date().toISOString().substring(0, 10);

    // 1. ne rien faire si la feuille existe déjà
    const exists = await this.prisma.presenceSheet.findUnique({
      where: { date: today },
    });
    if (exists) return;

    // 2. crée la feuille avec un staffId « SYSTÈME »
    const sheet = await this.prisma.presenceSheet.create({
      data: {
        date: today,
        staffId: 'SYSTEM',          // ✅ valeur obligatoire
        status: 'PENDING_STAFF',
      },
    });

    // 3. ajoute un record absent pour chaque enfant
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
