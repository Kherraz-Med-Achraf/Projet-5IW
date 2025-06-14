import {
    Injectable,
    InternalServerErrorException,
    Logger,
  } from '@nestjs/common';
  import * as fs from 'node:fs/promises';
  import * as path from 'node:path';
  import * as crypto from 'node:crypto';
  import * as FormData from 'form-data';
  import { ConsentDocument, Role } from '@prisma/client';
  
  interface UploadedFileRes {
    id: string;
  }
  
  interface CreatedProcedureRes {
    id: string;
    members: { id: string; signatureLink: string; customId: string }[];
  }
  
  @Injectable()
  export class YousignService {
    private readonly logger = new Logger(YousignService.name);
    private readonly baseUrl =
      process.env.YOUSIGN_API_URL ?? 'https://api.yousign.com/v1';
    private readonly apiKey = process.env.YOUSIGN_API_KEY!;
    private readonly webhookSecret = process.env.YOUSIGN_WEBHOOK_SECRET ?? '';
  
    /* ----------------------------------------------------------- *
     * 1. Upload du fichier PDF dans Yousign
     * ----------------------------------------------------------- */
    private async uploadFile(filePath: string): Promise<string> {
      const form = new FormData();
      const buffer = await fs.readFile(filePath);
      form.append('file', buffer, {
        filename: path.basename(filePath),
        contentType: 'application/pdf',
      });
  
      const res = await fetch(`${this.baseUrl}/files`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          ...form.getHeaders(),
        },
        body: form as unknown as BodyInit, // cast requis pour TS < 5.3
      });
  
      if (!res.ok) {
        this.logger.error(await res.text());
        throw new InternalServerErrorException('Upload fichier Yousign échoué');
      }
  
      const json = (await res.json()) as UploadedFileRes;
      return json.id;
    }
  
    /* ----------------------------------------------------------- *
     * 2. Création de la procédure + ajout des membres
     * ----------------------------------------------------------- */
    async createProcedure(consent: ConsentDocument, filePath: string): Promise<{
      id: string;
      secretarySignUrl: string;
    }> {
      // 1) Upload
      const fileId = await this.uploadFile(filePath);
  
      // 2) Payload procédure
      const body = {
        name: consent.name,
        description: `Signature du consentement ${consent.name}`,
        members: [
          {
            firstname: 'Secrétaire',
            lastname: 'IME',
            email: '',
            fileObjects: [
              { file: fileId, page: 1, position: '150,500,200,550' },
            ],
            customId: 'SECRETARY_MEMBER',
            role: Role.SECRETARY,
          },
          {
            firstname: 'Parent',
            lastname: 'IME',
            email: '',
            fileObjects: [
              { file: fileId, page: 1, position: '150,400,200,450' },
            ],
            customId: 'PARENT_MEMBER',
            role: Role.PARENT,
          },
        ],
        ordered: true,
        webhook: {
          url: `${process.env.BACKEND_PUBLIC_URL}/documents/yousign/webhook`,
          method: 'POST',
          headers: { 'x-yousign-hook-signature': this.webhookSecret },
        },
      };
  
      const res = await fetch(`${this.baseUrl}/procedures`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
  
      if (!res.ok) {
        this.logger.error(await res.text());
        throw new InternalServerErrorException('Création procédure Yousign échouée');
      }
  
      const json = (await res.json()) as CreatedProcedureRes;
  
      const secretaryMember = json.members.find(
        (m) => m.customId === 'SECRETARY_MEMBER',
      );
      if (!secretaryMember) {
        throw new InternalServerErrorException(
          'Member secrétaire introuvable dans la procédure',
        );
      }
  
      return { id: json.id, secretarySignUrl: secretaryMember.signatureLink };
    }
  
    /* ----------------------------------------------------------- *
     * 3. URL de signature (secrétaire ou parent)
     * ----------------------------------------------------------- */
    async getMemberSignUrl(procId: string, isSecretary: boolean) {
      const res = await fetch(`${this.baseUrl}/procedures/${procId}`, {
        headers: { Authorization: `Bearer ${this.apiKey}` },
      });
  
      if (!res.ok) {
        this.logger.error(await res.text());
        throw new InternalServerErrorException('Lecture procédure Yousign échouée');
      }
  
      const json = (await res.json()) as CreatedProcedureRes;
  
      const wanted = json.members.find((m) =>
        isSecretary
          ? m.customId === 'SECRETARY_MEMBER'
          : m.customId === 'PARENT_MEMBER',
      );
      if (!wanted)
        throw new InternalServerErrorException('Member introuvable dans la procédure');
  
      return wanted.signatureLink;
    }
  
    /* ----------------------------------------------------------- *
     * 4. Téléchargement du PDF final signé
     * ----------------------------------------------------------- */
    async downloadFinalFile(procId: string, dest: string) {
      const res = await fetch(`${this.baseUrl}/procedures/${procId}/download`, {
        headers: { Authorization: `Bearer ${this.apiKey}` },
      });
  
      if (!res.ok) {
        this.logger.error(await res.text());
        throw new InternalServerErrorException('Téléchargement PDF échoué');
      }
  
      const buffer = Buffer.from(await res.arrayBuffer());
      await fs.writeFile(dest, buffer);
      this.logger.log(`PDF final téléchargé ➜ ${dest}`);
    }
  
    /* ----------------------------------------------------------- *
     * 5. Vérification HMAC du webhook
     * ----------------------------------------------------------- */
    verifyWebhookSignature(rawBody: string, headerSignature: string): boolean {
      if (!this.webhookSecret) return true;
      const hmac = crypto
        .createHmac('sha256', this.webhookSecret)
        .update(rawBody, 'utf8')
        .digest('hex');
      return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(headerSignature));
    }
  }
  