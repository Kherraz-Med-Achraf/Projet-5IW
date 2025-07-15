import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PresenceCron {
  constructor(private readonly prisma: PrismaService) {}

  // Exécution à minuit tous les jours
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleCron() {
    console.log('🚀 [CRON] Démarrage du cron de création des feuilles de présence à minuit');
    try {
      await this.createTodayPresenceSheet();
      await this.createMissingPresenceSheets();
      console.log('✅ [CRON] Cron de présence terminé avec succès');
    } catch (error) {
      console.error('❌ [CRON] Erreur lors de l\'exécution du cron:', error);
    }
  }

  private async createTodayPresenceSheet() {
    const todayDate = new Date();
    const dayOfWeek = todayDate.getDay();
    
    console.log(`📅 [CRON] Création de la feuille pour aujourd'hui: ${todayDate.toISOString().substring(0, 10)} (jour ${dayOfWeek})`);
    
    // Ignorer les dimanches (jour 0) car c'est généralement fermé
    if (dayOfWeek === 0) {
      console.log('⏸️  [CRON] Dimanche détecté, pas de feuille créée');
      return;
    }

    // Vérifier si une feuille existe déjà pour aujourd'hui
    const existingSheet = await this.prisma.presenceSheet.findFirst({
      where: {
        date: {
          gte: new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate()),
          lt: new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate() + 1),
        },
      },
    });

    if (existingSheet) {
      console.log(`🔄 [CRON] Feuille déjà existante pour aujourd'hui (ID: ${existingSheet.id})`);
      return;
    }

    // Récupérer tous les enfants actifs
    const children = await this.prisma.child.findMany({
      select: { id: true, firstName: true, lastName: true },
    });

    if (children.length === 0) {
      console.log('⚠️ [CRON] Aucun enfant trouvé dans la base de données');
      return;
    }

    // Créer la feuille de présence avec tous les enfants par défaut absents
    const newSheet = await this.prisma.presenceSheet.create({
      data: {
        date: todayDate,
        status: 'PENDING_STAFF',
        records: {
          create: children.map((child) => ({
            childId: child.id,
            present: false, // Par défaut, tous les enfants sont marqués absents
          })),
        },
      },
      include: { records: true },
    });

    console.log(`🎉 [CRON] Feuille créée avec succès (ID: ${newSheet.id}) avec ${newSheet.records.length} enfants`);
  }

  private async createMissingPresenceSheets() {
    console.log('🔍 [CRON] Vérification des feuilles manquantes des 14 derniers jours');
    
    const endDate = new Date();
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 14);

    let createdSheets = 0;
    const current = new Date(startDate);
    
    while (current <= endDate) {
      const dayOfWeek = current.getDay();
      
      // Ignorer les dimanches
      if (dayOfWeek === 0) {
        current.setDate(current.getDate() + 1);
        continue;
      }

      // Vérifier si une feuille existe pour ce jour
      const exists = await this.prisma.presenceSheet.findFirst({
        where: {
          date: {
            gte: new Date(current.getFullYear(), current.getMonth(), current.getDate()),
            lt: new Date(current.getFullYear(), current.getMonth(), current.getDate() + 1),
          },
        },
        include: { records: true },
      });

      if (!exists) {
        // Créer une feuille manquante
        const children = await this.prisma.child.findMany({
          select: { id: true, firstName: true, lastName: true },
        });

        if (children.length > 0) {
          const createdSheet = await this.prisma.presenceSheet.create({
            data: {
              date: new Date(current),
              status: 'PENDING_STAFF',
              records: {
                create: children.map((child) => ({
                  childId: child.id,
                  present: false,
                })),
              },
            },
          });
          createdSheets++;
          console.log(`📋 [CRON] Feuille créée pour ${current.toISOString().substring(0, 10)} (ID: ${createdSheet.id})`);
        }
      } else if (exists.records.length === 0) {
        // Feuille existe mais sans enregistrements, les ajouter
        const children = await this.prisma.child.findMany({
          select: { id: true, firstName: true, lastName: true },
        });

        if (children.length > 0) {
          await this.prisma.presenceSheet.update({
            where: { id: exists.id },
            data: {
              records: {
                create: children.map((child) => ({
                  childId: child.id,
                  present: false,
                })),
              },
            },
          });
          console.log(`🔧 [CRON] Enregistrements ajoutés à la feuille existante ${exists.id} pour ${current.toISOString().substring(0, 10)}`);
        }
      }

      current.setDate(current.getDate() + 1);
    }
    
    console.log(`📊 [CRON] Vérification terminée: ${createdSheets} feuilles créées`);
  }
}
