import { Injectable, Logger, BadRequestException, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { readSecret } from '../utils/secret';
import axios, { AxiosInstance } from 'axios';

export interface YouSignConfig {
  apiKey: string;
  apiBaseUrl: string;
  webhookSecret: string;
}

export interface YouSignDocument {
  id: string;
  name: string;
  nature: 'signable_document';
  content: string; // Base64 encoded content
}

export interface YouSignSigner {
  id: string;
  info: {
    first_name: string;
    last_name: string;
    email: string;
    phone_number?: string;
  };
  authentication_mode: 'sms' | 'email' | 'none';
  signature_level: 'electronic_signature' | 'advanced_electronic_signature' | 'qualified_electronic_signature';
  signature_authentication_mode: 'email' | 'sms' | 'none';
  redirect_urls?: {
    success?: string;
    error?: string;
  };
}

export interface YouSignSignatureRequest {
  name: string;
  delivery_mode: 'email' | 'none';
  signers: YouSignSigner[];
  documents: YouSignDocument[];
  metadata?: Record<string, any>;
  webhook_subscription?: {
    endpoint: string;
    events: string[];
  };
}

export interface YouSignSignatureResponse {
  id: string;
  status: string;
  name: string;
  signers: any[];
  documents: any[];
  created_at: string;
  updated_at: string;
}

export interface YouSignWebhookData {
  event_type: string;
  signature_request_id: string;
  signer_id?: string;
  timestamp: string;
  data: any;
}

@Injectable()
export class YouSignService {
  private readonly logger = new Logger(YouSignService.name);
  private readonly config: YouSignConfig;
  private readonly httpClient: AxiosInstance;

  constructor() {
    // Lecture des secrets avec fallback vers variables d'environnement
    const yousignWebhookSecret = readSecret(
      '/run/secrets/yousign_webhook_secret',  // Chemin vers le fichier secret
      'YOUSIGN_WEBHOOK_SECRET'                // Variable d'environnement
    );

    this.config = {
      apiKey: readSecret('/run/secrets/yousign_api_key', 'YOUSIGN_API_KEY'),
      apiBaseUrl: process.env.YOUSIGN_API_BASE_URL || 'https://api.yousign.com/v3',
      webhookSecret: yousignWebhookSecret,
    };

    this.httpClient = axios.create({
      baseURL: this.config.apiBaseUrl,
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    this.logger.log('🔏 YouSign service initialized');
  }

  /**
   * Créer et activer une demande de signature
   */
  async createAndActivateSignature(
    documentBuffer: Buffer,
    documentName: string,
    signers: Array<{
      firstName: string;
      lastName: string;
      email: string;
      phone?: string;
    }>,
    metadata: Record<string, any> = {},
    webhookUrl?: string
  ): Promise<YouSignSignatureResponse> {
    try {
      this.logger.log(`📝 Creating signature request for document: ${documentName}`);

      // Encoder le document en base64
      const documentBase64 = documentBuffer.toString('base64');

      // Préparer les signataires
      const youSignSigners: YouSignSigner[] = signers.map((signer, index) => ({
        id: `signer-${index}`,
        info: {
          first_name: signer.firstName,
          last_name: signer.lastName,
          email: signer.email,
          phone_number: signer.phone,
        },
        authentication_mode: 'email',
        signature_level: 'electronic_signature',
        signature_authentication_mode: 'email',
      }));

      // Préparer le document
      const youSignDocument: YouSignDocument = {
        id: 'document-1',
        name: documentName,
        nature: 'signable_document',
        content: documentBase64,
      };

      // Préparer la demande de signature
      const signatureRequest: YouSignSignatureRequest = {
        name: `Signature - ${documentName}`,
        delivery_mode: 'email',
        signers: youSignSigners,
        documents: [youSignDocument],
        metadata,
      };

      // Ajouter le webhook si fourni
      if (webhookUrl) {
        signatureRequest.webhook_subscription = {
          endpoint: webhookUrl,
          events: [
            'signature_request.completed',
            'signature_request.expired',
            'signature_request.cancelled',
          ],
        };
      }

      // Créer la demande de signature
      const response = await this.httpClient.post('/signature_requests', signatureRequest);
      
      this.logger.log(`✅ Signature request created: ${response.data.id}`);
      
      // Activer la demande de signature
      await this.activateSignatureRequest(response.data.id);

      return response.data;

    } catch (error) {
      this.logger.error(`❌ Failed to create signature request: ${error.message}`);
      throw new InternalServerErrorException('Erreur lors de la création de la demande de signature');
    }
  }

  /**
   * Activer une demande de signature
   */
  async activateSignatureRequest(signatureRequestId: string): Promise<void> {
    try {
      await this.httpClient.patch(`/signature_requests/${signatureRequestId}/activate`);
      this.logger.log(`🚀 Signature request activated: ${signatureRequestId}`);
    } catch (error) {
      this.logger.error(`❌ Failed to activate signature request: ${error.message}`);
      throw new InternalServerErrorException('Erreur lors de l\'activation de la demande de signature');
    }
  }

  /**
   * Obtenir le lien de signature pour un signataire
   */
  async getSignatureLink(signatureRequestId: string, signerId: string): Promise<string> {
    try {
      const response = await this.httpClient.get(
        `/signature_requests/${signatureRequestId}/signers/${signerId}/signature_link`
      );
      
      this.logger.log(`🔗 Signature link retrieved for ${signerId}`);
      return response.data.value;

    } catch (error) {
      this.logger.error(`❌ Failed to get signature link: ${error.message}`);
      throw new InternalServerErrorException('Erreur lors de la récupération du lien de signature');
    }
  }

  /**
   * Obtenir les détails d'une demande de signature
   */
  async getSignatureRequest(signatureRequestId: string): Promise<YouSignSignatureResponse> {
    try {
      const response = await this.httpClient.get(`/signature_requests/${signatureRequestId}`);
      return response.data;
    } catch (error) {
      this.logger.error(`❌ Failed to get signature request: ${error.message}`);
      throw new NotFoundException('Demande de signature introuvable');
    }
  }

  /**
   * Vérifier la signature d'un webhook
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    try {
      const crypto = require('crypto');
      const expectedSignature = crypto
        .createHmac('sha256', this.config.webhookSecret)
        .update(payload)
        .digest('hex');

      return crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
      );
    } catch (error) {
      this.logger.error(`❌ Failed to verify webhook signature: ${error.message}`);
      return false;
    }
  }

  /**
   * Traiter un webhook YouSign
   */
  async processWebhook(webhookData: YouSignWebhookData): Promise<void> {
    try {
      this.logger.log(`📨 Processing webhook: ${webhookData.event_type}`);

      switch (webhookData.event_type) {
        case 'signature_request.completed':
          await this.handleSignatureCompleted(webhookData);
          break;
        case 'signature_request.expired':
          await this.handleSignatureExpired(webhookData);
          break;
        case 'signature_request.cancelled':
          await this.handleSignatureCancelled(webhookData);
          break;
        default:
          this.logger.warn(`🤷 Unhandled webhook event: ${webhookData.event_type}`);
      }

    } catch (error) {
      this.logger.error(`❌ Failed to process webhook: ${error.message}`);
      throw error;
    }
  }

  /**
   * Gérer une signature complétée
   */
  private async handleSignatureCompleted(webhookData: YouSignWebhookData): Promise<void> {
    this.logger.log(`✅ Signature completed: ${webhookData.signature_request_id}`);
    // Logic will be implemented in the webhook controller
  }

  /**
   * Gérer une signature expirée
   */
  private async handleSignatureExpired(webhookData: YouSignWebhookData): Promise<void> {
    this.logger.log(`⏰ Signature expired: ${webhookData.signature_request_id}`);
    // Logic will be implemented in the webhook controller
  }

  /**
   * Gérer une signature annulée
   */
  private async handleSignatureCancelled(webhookData: YouSignWebhookData): Promise<void> {
    this.logger.log(`❌ Signature cancelled: ${webhookData.signature_request_id}`);
    // Logic will be implemented in the webhook controller
  }
} 