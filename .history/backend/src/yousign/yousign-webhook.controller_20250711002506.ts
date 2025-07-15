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

      // Traiter le webhook
      const webhookData: YouSignWebhookData = await this.youSignService.processWebhook(
        JSON.stringify(rawBody),
        signature
      );

      // Traiter selon le type d'événement
      await this.processWebhookEvent(webhookData);

      return { status: 'success', message: 'Webhook processed successfully' };

    } catch (error) {
      this.logger.error('❌ Failed to process webhook:', error.message);
      return { 
        status: 'error', 
        message: 'Failed to process webhook',
        error: error.message 
      };
    }
  }

  private async processWebhookEvent(webhookData: YouSignWebhookData) {
    const { event_name, signature_request } = webhookData;

    this.logger.log(`🔄 Processing event: ${event_name}`);

    switch (event_name) {
      case 'signature_request.activated':
        await this.handleSignatureRequestActivated(signature_request);
        break;
      
      case 'signature_request.completed':
        await this.handleSignatureRequestCompleted(signature_request);
        break;
      
      case 'signature_request.expired':
        await this.handleSignatureRequestExpired(signature_request);
        break;
      
      case 'signature_request.canceled':
        await this.handleSignatureRequestCanceled(signature_request);
        break;
      
      case 'signer.signed':
        await this.handleSignerSigned(signature_request, webhookData.signer);
        break;
      
      case 'signer.reminded':
        await this.handleSignerReminded(signature_request, webhookData.signer);
        break;
      
      default:
        this.logger.warn(`⚠️ Unhandled event type: ${event_name}`);
    }
  }

  private async handleSignatureRequestActivated(signatureRequest: any) {
    this.logger.log(`🚀 Signature request activated: ${signatureRequest.id}`);
    
    // Mettre à jour le statut dans la base de données
    await this.updateDocumentSignatureStatus(signatureRequest.id, 'PENDING');
  }

  private async handleSignatureRequestCompleted(signatureRequest: any) {
    this.logger.log(`✅ Signature request completed: ${signatureRequest.id}`);
    
    try {
      // Mettre à jour le statut dans la base de données
      await this.updateDocumentSignatureStatus(signatureRequest.id, 'SIGNED');
      
      // Télécharger les documents signés si nécessaire
      const signedDocuments = await this.youSignService.downloadSignedDocuments(signatureRequest.id);
      
      // Stocker les documents signés (optionnel)
      await this.storeSignedDocuments(signatureRequest.id, signedDocuments);
      
      this.logger.log(`📥 Signed documents processed for: ${signatureRequest.id}`);
      
    } catch (error) {
      this.logger.error(`❌ Failed to process completed signature: ${error.message}`);
    }
  }

  private async handleSignatureRequestExpired(signatureRequest: any) {
    this.logger.log(`⏰ Signature request expired: ${signatureRequest.id}`);
    
    // Mettre à jour le statut dans la base de données
    await this.updateDocumentSignatureStatus(signatureRequest.id, 'EXPIRED');
  }

  private async handleSignatureRequestCanceled(signatureRequest: any) {
    this.logger.log(`❌ Signature request canceled: ${signatureRequest.id}`);
    
    // Mettre à jour le statut dans la base de données
    await this.updateDocumentSignatureStatus(signatureRequest.id, 'CANCELED');
  }

  private async handleSignerSigned(signatureRequest: any, signer: any) {
    if (!signer) return;
    
    this.logger.log(`✍️ Signer signed: ${signer.info.email} for request: ${signatureRequest.id}`);
    
    try {
      // Mettre à jour le statut de signature individuelle
      await this.updateIndividualSignatureStatus(signatureRequest.id, signer.info.email, 'SIGNED');
      
      this.logger.log(`📝 Individual signature updated for: ${signer.info.email}`);
      
    } catch (error) {
      this.logger.error(`❌ Failed to update individual signature: ${error.message}`);
    }
  }

  private async handleSignerReminded(signatureRequest: any, signer: any) {
    if (!signer) return;
    
    this.logger.log(`📧 Signer reminded: ${signer.info.email} for request: ${signatureRequest.id}`);
    
    // Optionnel : enregistrer les rappels pour le suivi
    // await this.logSignerReminder(signatureRequest.id, signer.info.email);
  }

  private async updateDocumentSignatureStatus(
    youSignRequestId: string,
    status: SignatureStatus
  ) {
    try {
      // Trouver le document par son ID YouSign dans les metadata
      const document = await this.prisma.document.findFirst({
        where: {
          // Supposons que l'ID YouSign est stocké dans les metadata
          // Vous pourriez aussi ajouter un champ spécifique youSignRequestId
          youSignRequestId: youSignRequestId,
        },
        include: {
          signatures: true,
        },
      });

      if (!document) {
        this.logger.warn(`⚠️ Document not found for YouSign request: ${youSignRequestId}`);
        return;
      }

      // Mettre à jour toutes les signatures du document
      await this.prisma.documentSignature.updateMany({
        where: {
          documentId: document.id,
        },
        data: {
          status,
          signedAt: status === 'SIGNED' ? new Date() : null,
        },
      });

      this.logger.log(`✅ Document signature status updated: ${document.id} -> ${status}`);

    } catch (error) {
      this.logger.error(`❌ Failed to update document signature status: ${error.message}`);
    }
  }

  private async updateIndividualSignatureStatus(
    youSignRequestId: string,
    signerEmail: string,
    status: SignatureStatus
  ) {
    try {
      // Trouver la signature individuelle
      const signature = await this.prisma.documentSignature.findFirst({
        where: {
          document: {
            youSignRequestId: youSignRequestId,
          },
          parent: {
            user: {
              email: signerEmail,
            },
          },
        },
      });

      if (!signature) {
        this.logger.warn(`⚠️ Signature not found for email: ${signerEmail} and request: ${youSignRequestId}`);
        return;
      }

      // Mettre à jour la signature individuelle
      await this.prisma.documentSignature.update({
        where: {
          id: signature.id,
        },
        data: {
          status,
          signedAt: status === 'SIGNED' ? new Date() : null,
        },
      });

      this.logger.log(`✅ Individual signature updated: ${signerEmail} -> ${status}`);

    } catch (error) {
      this.logger.error(`❌ Failed to update individual signature: ${error.message}`);
    }
  }

  private async storeSignedDocuments(youSignRequestId: string, documentsBuffer: Buffer) {
    try {
      // Trouver le document
      const document = await this.prisma.document.findFirst({
        where: {
          youSignRequestId: youSignRequestId,
        },
      });

      if (!document) {
        this.logger.warn(`⚠️ Document not found for storing signed version: ${youSignRequestId}`);
        return;
      }

      // Stocker le document signé (vous pouvez ajuster selon votre logique de stockage)
      const signedFilename = `signed_${document.filepath}`;
      const fs = require('fs');
      const path = require('path');
      
      const signedFilePath = path.join(process.cwd(), 'uploads', 'documents', 'signed', signedFilename);
      
      // Créer le répertoire si nécessaire
      const signedDir = path.dirname(signedFilePath);
      if (!fs.existsSync(signedDir)) {
        fs.mkdirSync(signedDir, { recursive: true });
      }
      
      // Sauvegarder le document signé
      fs.writeFileSync(signedFilePath, documentsBuffer);
      
      // Optionnel : mettre à jour le document avec le chemin du fichier signé
      await this.prisma.document.update({
        where: {
          id: document.id,
        },
        data: {
          signedFilePath: signedFilename,
        },
      });

      this.logger.log(`📁 Signed document stored: ${signedFilename}`);

    } catch (error) {
      this.logger.error(`❌ Failed to store signed documents: ${error.message}`);
    }
  }
} 