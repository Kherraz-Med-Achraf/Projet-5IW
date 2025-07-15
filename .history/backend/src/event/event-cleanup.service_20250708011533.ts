import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentMethod, PaymentStatus } from '@prisma/client';
import { MailService } from '../mail/mail.service';

@Injectable()
export class EventCleanupService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  /**
   * Nettoie les sessions Stripe expirées toutes les heures
   * Sécurité au cas où les webhooks Stripe ne fonctionneraient pas
   */
  @Cron(CronExpression.EVERY_HOUR)
  async cleanupExpiredStripeSessions() {
    console.log('🧹 Starting cleanup of expired Stripe sessions...');

    // Sessions PENDING depuis plus de 2 heures (Stripe expire après 24h, mais on est plus strict)
    const expirationTime = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 heures

    try {
      const expiredRegistrations = await this.prisma.eventRegistration.findMany({
        where: {
          paymentMethod: PaymentMethod.STRIPE,
          paymentStatus: PaymentStatus.PENDING,
          createdAt: { lt: expirationTime },
        },
        include: {
          event: true,
          parentProfile: { include: { user: true } },
          children: { include: { child: true } },
        },
      });

      if (expiredRegistrations.length === 0) {
        console.log('✅ No expired Stripe sessions found');
        return;
      }

      console.log(`🗑️ Found ${expiredRegistrations.length} expired Stripe sessions to cleanup`);

      let cleanedCount = 0;

      for (const reg of expiredRegistrations) {
        try {
          await this.cleanupSingleExpiredRegistration(reg);
          cleanedCount++;
        } catch (error) {
          console.error(`❌ Failed to cleanup registration ${reg.id}:`, error);
        }
      }

      console.log(`✅ Cleanup completed: ${cleanedCount}/${expiredRegistrations.length} registrations cleaned`);
    } catch (error) {
      console.error('❌ Error during expired sessions cleanup:', error);
    }
  }

  private async cleanupSingleExpiredRegistration(registration: any) {
    const { id: registrationId, event, parentProfile, children } = registration;

    // Supprimer la registration expirée en transaction
    await this.prisma.$transaction(async (tx) => {
      await tx.eventRegistrationChild.deleteMany({
        where: { registrationId },
      });
      await tx.eventRegistration.delete({
        where: { id: registrationId },
      });

      // Vérifier s'il reste des inscriptions validées pour cet événement
      const remainingValidatedChildren = await tx.eventRegistrationChild.count({
        where: {
          registration: {
            eventId: event.id,
            OR: [
              { paymentStatus: { in: [PaymentStatus.PAID, PaymentStatus.FREE] } },
              {
                paymentMethod: PaymentMethod.CHEQUE,
                paymentStatus: PaymentStatus.PENDING,
              },
              {
                paymentMethod: PaymentMethod.STRIPE,
                paymentStatus: PaymentStatus.PENDING,
              },
            ],
          },
        },
      });

      // Si plus aucune inscription validée, déverrouille l'événement
      if (remainingValidatedChildren === 0) {
        await tx.event.update({
          where: { id: event.id },
          data: { isLocked: false },
        });
        console.log(`🔓 Event ${event.id} unlocked after cleanup`);
      }
    });

    // Notifier le parent
    const childrenNames = children
      .map((c: any) => `${c.child.firstName} ${c.child.lastName}`)
      .join(', ');

    await this.mail.sendMail(
      parentProfile.user.email,
      `Session de paiement expirée : ${event.title}`,
      `<p>Bonjour,</p>
       <p>Votre session de paiement pour l'événement <strong>${event.title}</strong> a expiré.</p>
       <p>Enfants concernés : ${childrenNames}</p>
       <p>Votre inscription a été automatiquement annulée et les places ont été libérées.</p>
       <p>Vous pouvez vous réinscrire si des places sont encore disponibles.</p>
       <p><a href="https://educareschool.me/events">Voir les événements disponibles</a></p>`,
    );

    console.log(`🗑️ Expired registration ${registrationId} cleaned up (user: ${parentProfile.user.email})`);
  }

  /**
   * Manuel : nettoie toutes les sessions expirées immédiatement
   * Utile pour les tests ou en cas de problème
   */
  async forceCleanupExpiredSessions() {
    console.log('🚀 Force cleanup of expired Stripe sessions...');
    await this.cleanupExpiredStripeSessions();
  }
} 