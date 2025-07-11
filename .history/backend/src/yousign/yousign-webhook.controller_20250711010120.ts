import { Controller, Post, Body, Headers, Logger, HttpStatus } from '@nestjs/common';
import { YouSignService, YouSignWebhookData } from './yousign.service';
import { PrismaService } from '../prisma/prisma.service';
import { Public } from '../common/decorators/public.decorator';
import { SignatureStatus } from '@prisma/client';

@Controller('yousign')
export class YouSignWebhookController {
  private readonly logger = new Logger(YouSignWebhookController.name);

  constructor(
    private readonly youSignService: YouSignService,
    private readonly prisma: PrismaService
  ) {}

  @Public()
  @Post('webhook')
  async handleWebhook(
    @Body() rawBody: any,
    @Headers('X-Yousign-Signature') signature: string,
  ) {
    try {
      this.logger.log('📨 Received YouSign webhook');

      // Vérifier la signature du webhook
      const payloadString = JSON.stringify(rawBody);
      if (!this.youSignService.verifyWebhookSignature(payloadString, signature)) {
        this.logger.error('❌ Invalid webhook signature');
        return { status: 'error', message: 'Invalid signature' };
      }

      // Traiter le webhook
      await this.youSignService.processWebhook(rawBody);

      // Traiter selon le type d'événement
      await this.processWebhookEvent(rawBody);

      return { status: 'success' };

    } catch (error) {
      this.logger.error('❌ Failed to process webhook:', error.message);
      return { status: 'error', message: error.message };
    }
  }

  private async processWebhookEvent(webhookData: any) {
    try {
      const { event_type, signature_request_id } = webhookData;
      
      this.logger.log(`📋 Processing event: ${event_type} for request: ${signature_request_id}`);

      switch (event_type) {
        case 'signature_request.completed':
          await this.handleSignatureCompleted(signature_request_id);
          break;
        case 'signature_request.expired':
          await this.handleSignatureExpired(signature_request_id);
          break;
        case 'signature_request.cancelled':
          await this.handleSignatureCancelled(signature_request_id);
          break;
        default:
          this.logger.warn(`🤷 Unhandled webhook event: ${event_type}`);
      }

    } catch (error) {
      this.logger.error('❌ Failed to process webhook event:', error.message);
      throw error;
    }
  }

  private async handleSignatureCompleted(signatureRequestId: string) {
    try {
      this.logger.log(`✅ Handling signature completion for: ${signatureRequestId}`);

      // Mettre à jour le statut des signatures
      await this.updateDocumentSignatureStatus(signatureRequestId, SignatureStatus.SIGNED);

      // TODO: Télécharger et sauvegarder les documents signés
      // const signedDocuments = await this.youSignService.downloadSignedDocuments(signatureRequestId);
      
      this.logger.log(`✅ Signature completion processed: ${signatureRequestId}`);

    } catch (error) {
      this.logger.error('❌ Failed to handle signature completion:', error.message);
      throw error;
    }
  }

  private async handleSignatureExpired(signatureRequestId: string) {
    try {
      this.logger.log(`⏰ Handling signature expiration for: ${signatureRequestId}`);

      await this.updateDocumentSignatureStatus(signatureRequestId, SignatureStatus.EXPIRED);

      this.logger.log(`⏰ Signature expiration processed: ${signatureRequestId}`);

    } catch (error) {
      this.logger.error('❌ Failed to handle signature expiration:', error.message);
      throw error;
    }
  }

  private async handleSignatureCancelled(signatureRequestId: string) {
    try {
      this.logger.log(`❌ Handling signature cancellation for: ${signatureRequestId}`);

      await this.updateDocumentSignatureStatus(signatureRequestId, SignatureStatus.CANCELLED);

      this.logger.log(`❌ Signature cancellation processed: ${signatureRequestId}`);

    } catch (error) {
      this.logger.error('❌ Failed to handle signature cancellation:', error.message);
      throw error;
    }
  }

  private async updateDocumentSignatureStatus(youSignRequestId: string, status: SignatureStatus) {
    try {
      // Trouver le document par son ID YouSign
      const document = await this.prisma.document.findFirst({
        where: { youSignRequestId },
        include: { signatures: true }
      });

      if (!document) {
        throw new Error(`Document introuvable pour la demande YouSign: ${youSignRequestId}`);
      }

      // Mettre à jour toutes les signatures de ce document
      await this.prisma.documentSignature.updateMany({
        where: { documentId: document.id },
        data: { 
          status,
          signedAt: status === SignatureStatus.SIGNED ? new Date() : null
        }
      });

      this.logger.log(`✅ Updated signature status to ${status} for document: ${document.id}`);

    } catch (error) {
      this.logger.error('❌ Failed to update signature status:', error.message);
      throw error;
    }
  }
} 