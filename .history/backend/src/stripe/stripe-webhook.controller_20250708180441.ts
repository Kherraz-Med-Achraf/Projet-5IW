import { Controller, Post, Req, Res, Logger } from '@nestjs/common';
import { Request, Response } from 'express';
import Stripe from 'stripe';
import { EventService } from '../event/event.service';
import { readSecret } from '../utils/secret';
import { Public } from '../common/decorators/public.decorator';

@Controller('stripe')
export class StripeWebhookController {
  private readonly logger = new Logger(StripeWebhookController.name);
  private readonly stripe: Stripe;
  private readonly webhookSecret: string;

  constructor(private readonly eventService: EventService) {
    // Lire la clé Stripe depuis le secret Docker
    const stripeSecret = readSecret(
      '/run/secrets/stripe_secret',
      'STRIPE_SECRET',
    );

    // Lire le secret webhook depuis le secret Docker
    this.webhookSecret = readSecret(
      '/run/secrets/stripe_webhook_secret',
      'STRIPE_WEBHOOK_SECRET',
    );

    this.stripe = new Stripe(stripeSecret, {
      apiVersion: '2023-10-16',
    });
  }

  @Public()
  @Post('webhooks')
  async handleStripeWebhook(@Req() req: Request, @Res() res: Response) {
    const sig = req.headers['stripe-signature'] as string;
    let event: Stripe.Event;

    this.logger.log('Received webhook request from Stripe');

    try {
      event = this.stripe.webhooks.constructEvent(
        req.body,
        sig,
        this.webhookSecret,
      );
    } catch (err) {
      this.logger.error(`Webhook signature verification failed: ${err.message}`);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    this.logger.log(`✅ Webhook signature verified - Event: ${event.type}`);

    try {
      switch (event.type) {
        case 'checkout.session.completed':
          await this.handleCheckoutSessionCompleted(event);
          break;
        
        case 'checkout.session.expired':
          await this.handleCheckoutSessionExpired(event);
          break;
        
        case 'payment_intent.payment_failed':
          await this.handlePaymentIntentFailed(event);
          break;
        
        default:
          this.logger.warn(`Unhandled event type: ${event.type}`);
      }

      this.logger.log(`✅ Webhook processed successfully for event: ${event.type}`);
      res.status(200).send('Webhook processed successfully');
    } catch (error) {
      this.logger.error(`Error processing webhook: ${error.message}`);
      res.status(500).send('Webhook processing failed');
    }
  }

  private async handleCheckoutSessionCompleted(event: Stripe.Event) {
    const session = event.data.object as Stripe.Checkout.Session;
    this.logger.log(`Processing completed checkout session: ${session.id}`);

    try {
      await this.eventService.confirmStripePayment(session.id);
      this.logger.log(`Successfully confirmed payment for session: ${session.id}`);
    } catch (error) {
      this.logger.error(`Error confirming payment for session ${session.id}: ${error.message}`);
      throw error;
    }
  }

  private async handleCheckoutSessionExpired(event: Stripe.Event) {
    const session = event.data.object as Stripe.Checkout.Session;
    this.logger.log(`Processing expired checkout session: ${session.id}`);

    try {
      await this.eventService.handleExpiredStripeSession(session.id);
      this.logger.log(`Successfully handled expired session: ${session.id}`);
    } catch (error) {
      this.logger.error(`Error handling expired session ${session.id}: ${error.message}`);
      throw error;
    }
  }

  private async handlePaymentIntentFailed(event: Stripe.Event) {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    this.logger.log(`Processing failed payment intent: ${paymentIntent.id}`);

    try {
      await this.eventService.handleFailedStripePayment(paymentIntent.id);
      this.logger.log(`Successfully handled failed payment: ${paymentIntent.id}`);
    } catch (error) {
      this.logger.error(`Error handling failed payment ${paymentIntent.id}: ${error.message}`);
      throw error;
    }
  }
} 