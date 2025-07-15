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
          await this.handleChargeDispute(event.data.object as Stripe.Charge);
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
   * Gère l'échec d'un paiement
   */
  private async handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
    console.log(`❌ Payment failed: ${paymentIntent.id}`);
    // Potentiellement marquer la registration comme échouée
    // et libérer la place si nécessaire
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