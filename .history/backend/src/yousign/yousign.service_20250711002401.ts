import { Injectable, Logger, BadRequestException, InternalServerErrorException } from '@nestjs/common';
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
  signature_authentication_mode: 'sms' | 'email' | 'none';
  fields?: Array<{
    document_id: string;
    type: 'signature' | 'text' | 'date' | 'checkbox';
    height: number;
    width: number;
    page: number;
    x: number;
    y: number;
    optional?: boolean;
  }>;
}

export interface YouSignSignatureRequest {
  id: string;
  name: string;
  delivery_mode: 'email' | 'none';
  ordered_signers: boolean;
  reminder_settings?: {
    interval_in_days: number;
    max_occurrences: number;
  };
  timezone: string;
  email_custom_note?: string;
  custom_experience_id?: string;
  documents: YouSignDocument[];
  signers: YouSignSigner[];
  metadata?: Record<string, any>;
  webhook_subscription?: {
    target_url: string;
    subscribed_events: string[];
  };
}

export interface YouSignSignatureResponse {
  id: string;
  status: 'draft' | 'ongoing' | 'done' | 'expired' | 'canceled';
  name: string;
  created_at: string;
  ordered_signers: boolean;
  reminder_settings?: {
    interval_in_days: number;
    max_occurrences: number;
  };
  timezone: string;
  email_custom_note?: string;
  delivery_mode: string;
  documents: YouSignDocument[];
  signers: YouSignSigner[];
  metadata?: Record<string, any>;
  audit_trail?: {
    id: string;
    download_url: string;
  };
  signed_documents?: Array<{
    id: string;
    download_url: string;
  }>;
}

export interface YouSignWebhookData {
  event_name: string;
  signature_request: {
    id: string;
    status: string;
    name: string;
    created_at: string;
    documents: Array<{
      id: string;
      name: string;
      nature: string;
      status: string;
    }>;
    signers: Array<{
      id: string;
      status: string;
      info: {
        first_name: string;
        last_name: string;
        email: string;
      };
      signed_at?: string;
      signature_link?: string;
      signature_link_expires_at?: string;
    }>;
  };
  signer?: {
    id: string;
    status: string;
    info: {
      first_name: string;
      last_name: string;
      email: string;
    };
    signed_at?: string;
  };
  document?: {
    id: string;
    name: string;
    nature: string;
    status: string;
  };
}

@Injectable()
export class YouSignService {
  private readonly logger = new Logger(YouSignService.name);
  private readonly config: YouSignConfig;
  private readonly httpClient: AxiosInstance;

  constructor() {
    try {
      this.config = {
        apiKey: readSecret('/run/secrets/yousign_api_key', 'YOUSIGN_API_KEY'),
        apiBaseUrl: process.env.YOUSIGN_API_BASE_URL || 'https://api.yousign.app/v3',
        webhookSecret: readSecret('/run/secrets/yousign_webhook_secret', 'YOUSIGN_WEBHOOK_SECRET'),
      };

      this.httpClient = axios.create({
        baseURL: this.config.apiBaseUrl,
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      });

      this.logger.log('✅ YouSign service initialized successfully');
    } catch (error) {
      this.logger.error('❌ Failed to initialize YouSign service:', error.message);
      throw new InternalServerErrorException('YouSign service initialization failed');
    }
  }

  /**
   * Créer une nouvelle demande de signature
   */
  async createSignatureRequest(
    documentBuffer: Buffer,
    fileName: string,
    signers: Array<{
      firstName: string;
      lastName: string;
      email: string;
      phone?: string;
    }>,
    metadata?: Record<string, any>,
    webhookUrl?: string
  ): Promise<YouSignSignatureResponse> {
    try {
      this.logger.log(`🔏 Creating signature request for document: ${fileName}`);

      // Préparer le document
      const document: YouSignDocument = {
        id: `doc-${Date.now()}`,
        name: fileName,
        nature: 'signable_document',
        content: documentBuffer.toString('base64'),
      };

      // Préparer les signataires
      const yousignSigners: YouSignSigner[] = signers.map((signer, index) => ({
        id: `signer-${index + 1}`,
        info: {
          first_name: signer.firstName,
          last_name: signer.lastName,
          email: signer.email,
          phone_number: signer.phone,
        },
        authentication_mode: 'email',
        signature_level: 'electronic_signature',
        signature_authentication_mode: 'email',
        fields: [
          {
            document_id: document.id,
            type: 'signature',
            height: 37,
            width: 85,
            page: 1,
            x: 50,
            y: 100 + (index * 60), // Décaler les signatures verticalement
          },
        ],
      }));

      // Créer la demande de signature
      const signatureRequest: YouSignSignatureRequest = {
        id: `req-${Date.now()}`,
        name: `Signature - ${fileName}`,
        delivery_mode: 'email',
        ordered_signers: false,
        reminder_settings: {
          interval_in_days: 3,
          max_occurrences: 3,
        },
        timezone: 'Europe/Paris',
        email_custom_note: 'Merci de signer ce document dans les meilleurs délais.',
        documents: [document],
        signers: yousignSigners,
        metadata: metadata || {},
        webhook_subscription: webhookUrl ? {
          target_url: webhookUrl,
          subscribed_events: [
            'signature_request.activated',
            'signature_request.completed',
            'signature_request.expired',
            'signature_request.canceled',
            'signer.signed',
            'signer.reminded',
          ],
        } : undefined,
      };

      // Appeler l'API YouSign
      const response = await this.httpClient.post('/signature_requests', signatureRequest);
      
      this.logger.log(`✅ Signature request created successfully: ${response.data.id}`);
      return response.data;

    } catch (error) {
      this.logger.error('❌ Failed to create signature request:', error.response?.data || error.message);
      throw new InternalServerErrorException('Failed to create signature request');
    }
  }

  /**
   * Activer une demande de signature (l'envoyer aux signataires)
   */
  async activateSignatureRequest(signatureRequestId: string): Promise<void> {
    try {
      this.logger.log(`🚀 Activating signature request: ${signatureRequestId}`);

      await this.httpClient.post(`/signature_requests/${signatureRequestId}/activate`);
      
      this.logger.log(`✅ Signature request activated: ${signatureRequestId}`);

    } catch (error) {
      this.logger.error('❌ Failed to activate signature request:', error.response?.data || error.message);
      throw new InternalServerErrorException('Failed to activate signature request');
    }
  }

  /**
   * Obtenir les détails d'une demande de signature
   */
  async getSignatureRequest(signatureRequestId: string): Promise<YouSignSignatureResponse> {
    try {
      this.logger.log(`📋 Getting signature request: ${signatureRequestId}`);

      const response = await this.httpClient.get(`/signature_requests/${signatureRequestId}`);
      
      this.logger.log(`✅ Signature request details retrieved: ${signatureRequestId}`);
      return response.data;

    } catch (error) {
      this.logger.error('❌ Failed to get signature request:', error.response?.data || error.message);
      throw new InternalServerErrorException('Failed to get signature request');
    }
  }

  /**
   * Télécharger les documents signés
   */
  async downloadSignedDocuments(signatureRequestId: string): Promise<Buffer> {
    try {
      this.logger.log(`📥 Downloading signed documents for: ${signatureRequestId}`);

      const response = await this.httpClient.get(
        `/signature_requests/${signatureRequestId}/documents/download`,
        { responseType: 'arraybuffer' }
      );
      
      this.logger.log(`✅ Signed documents downloaded: ${signatureRequestId}`);
      return Buffer.from(response.data);

    } catch (error) {
      this.logger.error('❌ Failed to download signed documents:', error.response?.data || error.message);
      throw new InternalServerErrorException('Failed to download signed documents');
    }
  }

  /**
   * Obtenir le lien de signature pour un signataire
   */
  async getSignatureLink(signatureRequestId: string, signerId: string): Promise<string> {
    try {
      this.logger.log(`🔗 Getting signature link for signer: ${signerId}`);

      const response = await this.httpClient.get(
        `/signature_requests/${signatureRequestId}/signers/${signerId}/signature_link`
      );
      
      this.logger.log(`✅ Signature link retrieved for signer: ${signerId}`);
      return response.data.value;

    } catch (error) {
      this.logger.error('❌ Failed to get signature link:', error.response?.data || error.message);
      throw new InternalServerErrorException('Failed to get signature link');
    }
  }

  /**
   * Annuler une demande de signature
   */
  async cancelSignatureRequest(signatureRequestId: string): Promise<void> {
    try {
      this.logger.log(`❌ Canceling signature request: ${signatureRequestId}`);

      await this.httpClient.post(`/signature_requests/${signatureRequestId}/cancel`);
      
      this.logger.log(`✅ Signature request canceled: ${signatureRequestId}`);

    } catch (error) {
      this.logger.error('❌ Failed to cancel signature request:', error.response?.data || error.message);
      throw new InternalServerErrorException('Failed to cancel signature request');
    }
  }

  /**
   * Relancer les signataires
   */
  async remindSigners(signatureRequestId: string): Promise<void> {
    try {
      this.logger.log(`📧 Sending reminder for signature request: ${signatureRequestId}`);

      await this.httpClient.post(`/signature_requests/${signatureRequestId}/remind`);
      
      this.logger.log(`✅ Reminder sent for signature request: ${signatureRequestId}`);

    } catch (error) {
      this.logger.error('❌ Failed to send reminder:', error.response?.data || error.message);
      throw new InternalServerErrorException('Failed to send reminder');
    }
  }

  /**
   * Vérifier la signature du webhook
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    try {
      const crypto = require('crypto');
      const computedSignature = crypto
        .createHmac('sha256', this.config.webhookSecret)
        .update(payload)
        .digest('hex');

      return crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(computedSignature, 'hex')
      );
    } catch (error) {
      this.logger.error('❌ Failed to verify webhook signature:', error.message);
      return false;
    }
  }

  /**
   * Traiter un webhook YouSign
   */
  async processWebhook(payload: string, signature: string): Promise<YouSignWebhookData> {
    try {
      // Vérifier la signature
      if (!this.verifyWebhookSignature(payload, signature)) {
        throw new BadRequestException('Invalid webhook signature');
      }

      const webhookData: YouSignWebhookData = JSON.parse(payload);
      
      this.logger.log(`📨 Processing webhook event: ${webhookData.event_name}`);
      this.logger.log(`📋 Signature request: ${webhookData.signature_request.id}`);
      this.logger.log(`📊 Status: ${webhookData.signature_request.status}`);

      return webhookData;

    } catch (error) {
      this.logger.error('❌ Failed to process webhook:', error.message);
      throw new BadRequestException('Failed to process webhook');
    }
  }

  /**
   * Obtenir le statut d'une signature
   */
  mapYouSignStatusToLocal(yousignStatus: string): 'PENDING' | 'SIGNED' | 'EXPIRED' | 'CANCELED' {
    switch (yousignStatus) {
      case 'draft':
      case 'ongoing':
        return 'PENDING';
      case 'done':
        return 'SIGNED';
      case 'expired':
        return 'EXPIRED';
      case 'canceled':
        return 'CANCELED';
      default:
        return 'PENDING';
    }
  }

  /**
   * Créer une signature complète (créer + activer)
   */
  async createAndActivateSignature(
    documentBuffer: Buffer,
    fileName: string,
    signers: Array<{
      firstName: string;
      lastName: string;
      email: string;
      phone?: string;
    }>,
    metadata?: Record<string, any>,
    webhookUrl?: string
  ): Promise<YouSignSignatureResponse> {
    try {
      // Créer la demande de signature
      const signatureRequest = await this.createSignatureRequest(
        documentBuffer,
        fileName,
        signers,
        metadata,
        webhookUrl
      );

      // Activer la demande (envoyer aux signataires)
      await this.activateSignatureRequest(signatureRequest.id);

      // Retourner la demande mise à jour
      return await this.getSignatureRequest(signatureRequest.id);

    } catch (error) {
      this.logger.error('❌ Failed to create and activate signature:', error.message);
      throw error;
    }
  }
} 