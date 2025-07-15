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
    const today = new Date();
    // Créer une date à minuit pour la comparaison
    const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    try {
      // 1) ne rien faire si la feuille existe déjà
      const exists = await this.prisma.presenceSheet.findUnique({
        where: { date: todayDate },
      });
      
      if (exists) {
        console.log(`✅ Feuille pour ${todayDate.toLocaleDateString('fr-FR')} existe déjà`);
        return;
      }

      // 2) crée la feuille avec un staffId « SYSTEM »
      const sheet = await this.prisma.presenceSheet.create({
        data: {
          date: todayDate,
          staffId: null,
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

      console.log(`✅ Feuille créée pour ${todayDate.toLocaleDateString('fr-FR')} avec ${children.length} enfants`);
    } catch (error) {
      console.error(`❌ Erreur lors de la création de la feuille pour ${todayDate.toLocaleDateString('fr-FR')}:`, error);
    }
  }

  /** Vérifier et créer les feuilles manquantes au démarrage */
  private async checkAndCreateMissingSheets() {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    
    // Créer des dates à minuit pour les comparaisons
    const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const yesterdayDate = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
    
    // Vérifier aujourd'hui et hier (au cas où le serveur aurait été éteint)
    const datesToCheck = [todayDate, yesterdayDate];
    
    for (const date of datesToCheck) {
      const dayOfWeek = date.getDay();
      
      // Skip weekends (0 = Sunday, 6 = Saturday)
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        console.log(`⏭️  Skipping weekend day: ${date.toLocaleDateString('fr-FR')}`);
        continue;
      }
      
      try {
        const exists = await this.prisma.presenceSheet.findUnique({
          where: { date: date },
        });
        
        if (!exists) {
          console.log(`🔄 Creating missing sheet for: ${date.toLocaleDateString('fr-FR')}`);
          
          const sheet = await this.prisma.presenceSheet.create({
            data: {
              date: date,
              staffId: null,
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
          
          console.log(`✅ Missing sheet created for ${date.toLocaleDateString('fr-FR')} with ${children.length} enfants`);
        } else {
          console.log(`✅ Sheet already exists for ${date.toLocaleDateString('fr-FR')}`);
        }
      } catch (error) {
        console.error(`❌ Error checking/creating sheet for ${date.toLocaleDateString('fr-FR')}:`, error);
      }
    }
  }
}
