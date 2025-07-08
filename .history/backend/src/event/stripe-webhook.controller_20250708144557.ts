import {
  Controller,
  Post,
  Req,
  Res,
  Headers,
  HttpStatus,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import Stripe from 'stripe';
import { EventService } from './event.service';
import { Public } from '../common/decorators/public.decorator';
import * as fs from 'fs';

// Configuration Stripe
const stripeSecret = process.env.STRIPE_SECRET || (() => {
  try {
    return fs.readFileSync('/run/secrets/stripe_secret', 'utf8').trim();
  } catch {
    return '';
  }
})();

const stripe = new Stripe(stripeSecret, {
  apiVersion: '2023-10-16',
});

// Webhook endpoint secret pour vérifier les signatures
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || (() => {
  try {
    return fs.readFileSync('/run/secrets/stripe_webhook_secret', 'utf8').trim();
  } catch {
    console.warn('STRIPE_WEBHOOK_SECRET not found, webhook signature verification disabled');
    return '';
  }
})();

@Controller('stripe')
export class StripeWebhookController {
  constructor(private readonly eventService: EventService) {}

  @Public()
  @Post('webhooks')
  async handleWebhook(
    @Req() req: Request,
    @Res() res: Response,
    @Headers('stripe-signature') signature: string,
  ) {
    let event: Stripe.Event;

    try {
      // Vérification de la signature Stripe pour s'assurer que la requête vient bien de Stripe
      if (webhookSecret && signature) {
        event = stripe.webhooks.constructEvent(
          req.body,
          signature,
          webhookSecret,
        );
      } else {
        // Si pas de secret configuré, on parse directement (dev uniquement)
        event = req.body as Stripe.Event;
      }
    } catch (err) {
      console.error('⚠️  Webhook signature verification failed:', err.message);
      throw new BadRequestException('Invalid signature');
    }

    console.log(`🔔 Received Stripe event: ${event.type}`);

    try {
      // Traitement selon le type d'événement
      switch (event.type) {
        case 'checkout.session.completed':
          await this.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
          break;

        case 'payment_intent.succeeded':
          await this.handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent);
          break;

        case 'payment_intent.payment_failed':
          await this.handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
          break;

        case 'payment_intent.canceled':
          await this.handlePaymentCanceled(event.data.object as Stripe.PaymentIntent);
          break;

        case 'payment_intent.requires_action':
          await this.handlePaymentRequiresAction(event.data.object as Stripe.PaymentIntent);
          break;

        case 'charge.dispute.created':
          await this.handleChargeDispute(event.data.object as Stripe.Dispute);
          break;

        case 'checkout.session.expired':
          await this.handleCheckoutExpired(event.data.object as Stripe.Checkout.Session);
          break;

        default:
          console.log(`Unhandled event type: ${event.type}`);
      }

      res.status(HttpStatus.OK).json({ received: true });
    } catch (error) {
      console.error('Error processing webhook:', error);
      throw new InternalServerErrorException('Webhook processing failed');
    }
  }

  /**
   * Gère la finalisation d'une session de checkout
   * C'est l'événement principal pour confirmer un paiement
   */
  private async handleCheckoutCompleted(session: Stripe.Checkout.Session) {
    console.log(`✅ Checkout completed for session: ${session.id}`);

    // Récupérer l'ID de registration depuis les métadonnées
    const registrationId = session.metadata?.registrationId;
    if (!registrationId) {
      console.error('No registrationId found in session metadata');
      return;
    }

    try {
      // Mettre à jour le statut de paiement en base
      await this.eventService.confirmStripePayment(registrationId, session.id);
      console.log(`✅ Payment confirmed for registration: ${registrationId}`);
    } catch (error) {
      console.error(`❌ Failed to confirm payment for registration ${registrationId}:`, error);
      throw error;
    }
  }

  /**
   * Gère le succès d'un paiement (événement supplémentaire de confirmation)
   */
  private async handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent) {
    console.log(`✅ Payment succeeded: ${paymentIntent.id}`);
    // Logique supplémentaire si nécessaire (logs, notifications, etc.)
  }

  /**
   * Gère l'échec d'un paiement (carte refusée, fonds insuffisants, etc.)
   */
  private async handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
    console.log(`❌ Payment failed: ${paymentIntent.id} - ${paymentIntent.last_payment_error?.message || 'Unknown error'}`);
    
    // Récupérer l'ID de registration depuis les métadonnées
    const registrationId = paymentIntent.metadata?.registrationId;
    if (!registrationId) {
      console.error('No registrationId found in payment intent metadata');
      return;
    }

    try {
      // Gérer l'échec du paiement
      await this.eventService.handleFailedStripePayment(registrationId, paymentIntent.id, paymentIntent.last_payment_error?.message || 'Paiement refusé');
      console.log(`❌ Payment failure handled for registration: ${registrationId}`);
    } catch (error) {
      console.error(`❌ Failed to handle payment failure for registration ${registrationId}:`, error);
    }
  }

  /**
   * Gère l'annulation d'un paiement
   */
  private async handlePaymentCanceled(paymentIntent: Stripe.PaymentIntent) {
    console.log(`🚫 Payment canceled: ${paymentIntent.id}`);
    
    const registrationId = paymentIntent.metadata?.registrationId;
    if (!registrationId) {
      console.error('No registrationId found in canceled payment intent metadata');
      return;
    }

    try {
      // Gérer l'annulation du paiement
      await this.eventService.handleCanceledStripePayment(registrationId, paymentIntent.id);
      console.log(`🚫 Payment cancellation handled for registration: ${registrationId}`);
    } catch (error) {
      console.error(`❌ Failed to handle payment cancellation for registration ${registrationId}:`, error);
    }
  }

  /**
   * Gère les paiements nécessitant une action (3D Secure, etc.)
   */
  private async handlePaymentRequiresAction(paymentIntent: Stripe.PaymentIntent) {
    console.log(`⚠️  Payment requires action: ${paymentIntent.id}`);
    
    const registrationId = paymentIntent.metadata?.registrationId;
    if (!registrationId) {
      console.error('No registrationId found in payment intent metadata');
      return;
    }

    try {
      // Notifier que le paiement nécessite une action
      await this.eventService.handleStripePaymentRequiresAction(registrationId, paymentIntent.id);
      console.log(`⚠️  Payment action required handled for registration: ${registrationId}`);
    } catch (error) {
      console.error(`❌ Failed to handle payment action required for registration ${registrationId}:`, error);
    }
  }

  /**
   * Gère les contestations de paiement (chargeback)
   */
  private async handleChargeDispute(charge: Stripe.Charge) {
    console.log(`⚖️  Charge dispute created: ${charge.id}`);
    
    // Récupérer l'ID de registration depuis les métadonnées du payment intent
    const paymentIntentId = charge.payment_intent as string;
    if (!paymentIntentId) {
      console.error('No payment intent found in charge');
      return;
    }

    try {
      // Récupérer les détails du payment intent pour avoir les métadonnées
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      const registrationId = paymentIntent.metadata?.registrationId;
      
      if (!registrationId) {
        console.error('No registrationId found in payment intent metadata for dispute');
        return;
      }

      // Gérer la contestation
      await this.eventService.handleStripeChargeback(registrationId, charge.id, paymentIntentId);
      console.log(`⚖️  Chargeback handled for registration: ${registrationId}`);
    } catch (error) {
      console.error(`❌ Failed to handle chargeback for charge ${charge.id}:`, error);
    }
  }

  /**
   * Gère l'expiration d'une session de checkout
   */
  private async handleCheckoutExpired(session: Stripe.Checkout.Session) {
    console.log(`⏰ Checkout expired for session: ${session.id}`);

    const registrationId = session.metadata?.registrationId;
    if (!registrationId) {
      console.error('No registrationId found in expired session metadata');
      return;
    }

    try {
      // Annuler la registration expirée pour libérer la place
      await this.eventService.handleExpiredStripeSession(registrationId);
      console.log(`🗑️ Expired registration cleaned up: ${registrationId}`);
    } catch (error) {
      console.error(`❌ Failed to cleanup expired registration ${registrationId}:`, error);
    }
  }
} 