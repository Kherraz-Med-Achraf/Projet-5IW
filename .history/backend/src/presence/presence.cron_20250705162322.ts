import { Injectable, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PresenceCron implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  /** Vérifie au démarrage s'il manque des feuilles */
  async onModuleInit() {
    console.log('🚀 PresenceCron initialized - Checking for missing sheets...');
    await this.checkAndCreateMissingSheets();
  }

  /** Tous les jours à 06 h 00 (Europe/Paris) */
  @Cron('0 6 * * *', { timeZone: 'Europe/Paris' })
  async preCreateSheet() {
    console.log('⏰ Cron job triggered at 6:00 AM');
    await this.createSheetForToday();
  }

  /** Créer la feuille pour aujourd'hui */
  private async createSheetForToday() {
    const today = new Date().toISOString().substring(0, 10);
    
    try {
      // 1) ne rien faire si la feuille existe déjà
      const exists = await this.prisma.presenceSheet.findUnique({
        where: { date: today },
      });
      
      if (exists) {
        console.log(`✅ Feuille pour ${today} existe déjà`);
        return;
      }

      // 2) crée la feuille avec un staffId « SYSTEM »
      const sheet = await this.prisma.presenceSheet.create({
        data: {
          date: today,
          staffId: 'SYSTEM',
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

      console.log(`✅ Feuille créée pour ${today} avec ${children.length} enfants`);
    } catch (error) {
      console.error(`❌ Erreur lors de la création de la feuille pour ${today}:`, error);
    }
  }

  /** Vérifier et créer les feuilles manquantes au démarrage */
  private async checkAndCreateMissingSheets() {
    const today = new Date();
    
    // Vérifier aujourd'hui et hier (au cas où le serveur aurait été éteint)
    const datesToCheck = [
      today.toISOString().substring(0, 10),
      new Date(today.getTime() - 24 * 60 * 60 * 1000).toISOString().substring(0, 10)
    ];
    
    for (const dateStr of datesToCheck) {
      const date = new Date(dateStr);
      const dayOfWeek = date.getDay();
      
      // Skip weekends (0 = Sunday, 6 = Saturday)
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        console.log(`⏭️  Skipping weekend day: ${dateStr}`);
        continue;
      }
      
      try {
        const exists = await this.prisma.presenceSheet.findUnique({
          where: { date: dateStr },
        });
        
        if (!exists) {
          console.log(`🔄 Creating missing sheet for: ${dateStr}`);
          
          const sheet = await this.prisma.presenceSheet.create({
            data: {
              date: dateStr,
              staffId: 'SYSTEM',
              status: 'PENDING_STAFF',
            },
          });

          const children = await this.prisma.child.findMany();
          await this.prisma.presenceRecord.createMany({
            data: children.map((c) => ({
              sheetId: sheet.id,
              childId: c.id,
              present: false,
            })),
          });
          
          console.log(`✅ Missing sheet created for ${dateStr} with ${children.length} enfants`);
        } else {
          console.log(`✅ Sheet already exists for ${dateStr}`);
        }
      } catch (error) {
        console.error(`❌ Error checking/creating sheet for ${dateStr}:`, error);
      }
    }
  }
}
