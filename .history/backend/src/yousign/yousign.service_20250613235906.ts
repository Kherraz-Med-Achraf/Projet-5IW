import {
    Injectable,
    InternalServerErrorException,
    Logger,
  } from '@nestjs/common';
  import { HttpService } from '@nestjs/axios';
  import { firstValueFrom } from 'rxjs';
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
  
    constructor(private readonly http: HttpService) {}
  
    /* ----------------------------------------------------------- *
     * 1. Upload du fichier PDF dans Yousign
     * ----------------------------------------------------------- */
    private async uploadFile(filePath: string): Promise<string> {
      const form = new FormData();
      form.append('file', await fs.readFile(filePath), {
        filename: path.basename(filePath),
        contentType: 'application/pdf',
      });
  
      const { data } = await firstValueFrom(
        this.http.post<UploadedFileRes>(`${this.baseUrl}/files`, form, {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            ...form.getHeaders(),
          },
        }),
      );
  
      return data.id;
    }
  
    /* ----------------------------------------------------------- *
     * 2. Création de la procédure + ajout des membres
     * ----------------------------------------------------------- */
    async createProcedure(consent: ConsentDocument, filePath: string): Promise<{
      id: string;
      secretarySignUrl: string;
    }> {
      // 1) upload du fichier
      const fileId = await this.uploadFile(filePath);
  
      // 2) création de la procédure (inclut le fichier + les membres)
      const body = {
        name: consent.name,
        description: `Signature du consentement ${consent.name}`,
        members: [
          {
            firstname: 'Secrétaire',
            lastname: 'IME',
            email: '', // adresse du secrétariat – peut être vide si “in-person”
            fileObjects: [
              {
                file: fileId,
                page: 1,
                position: '150,500,200,550', // x1,y1,x2,y2  (exemple)
              },
            ],
            customId: 'SECRETARY_MEMBER',
            role: Role.SECRETARY,
          },
          {
            firstname: 'Parent',
            lastname: 'IME',
            email: '', // sera rempli côté front si tu veux un e-mail réel
            fileObjects: [
              {
                file: fileId,
                page: 1,
                position: '150,400,200,450',
              },
            ],
            customId: 'PARENT_MEMBER',
            role: Role.PARENT,
          },
        ],
        ordered: true,
        webhook: {
          url:
            process.env.BACKEND_PUBLIC_URL +
            '/documents/yousign/webhook',
          method: 'POST',
          headers: {
            'x-yousign-hook-signature': this.webhookSecret,
          },
        },
      };
  
      const { data } = await firstValueFrom(
        this.http.post<CreatedProcedureRes>(
          `${this.baseUrl}/procedures`,
          body,
          {
            headers: { Authorization: `Bearer ${this.apiKey}` },
          },
        ),
      );
  
      // 3) récupérer l’URL de signature du membre secrétaire
      const secretaryMember = data.members.find(
        (m) => m.customId === 'SECRETARY_MEMBER',
      );
  
      if (!secretaryMember) {
        throw new InternalServerErrorException(
          'Member secrétaire introuvable dans la procédure Yousign',
        );
      }
  
      return {
        id: data.id,
        secretarySignUrl: secretaryMember.signatureLink,
      };
    }
  
    /* ----------------------------------------------------------- *
     * 3. Récupération de l’URL de signature (secrétaire ou parent)
     * ----------------------------------------------------------- */
    async getMemberSignUrl(procId: string, isSecretary: boolean) {
      const { data } = await firstValueFrom(
        this.http.get<CreatedProcedureRes>(
          `${this.baseUrl}/procedures/${procId}`,
          {
            headers: { Authorization: `Bearer ${this.apiKey}` },
          },
        ),
      );
  
      const wanted = data.members.find((m) =>
        isSecretary
          ? m.customId === 'SECRETARY_MEMBER'
          : m.customId === 'PARENT_MEMBER',
      );
  
      if (!wanted) {
        throw new InternalServerErrorException('Member introuvable');
      }
      return wanted.signatureLink;
    }
  
    /* ----------------------------------------------------------- *
     * 4. Téléchargement du PDF final signé
     * ----------------------------------------------------------- */
    async downloadFinalFile(procId: string, dest: string) {
      const { data } = await firstValueFrom(
        this.http.get<ArrayBuffer>(`${this.baseUrl}/procedures/${procId}/download`, {
          responseType: 'arraybuffer',
          headers: { Authorization: `Bearer ${this.apiKey}` },
        }),
      );
      await fs.writeFile(dest, Buffer.from(data));
      this.logger.log(`PDF final téléchargé ➜ ${dest}`);
    }
  
    /* ----------------------------------------------------------- *
     * 5. Vérification de la signature HMAC du webhook
     * ----------------------------------------------------------- */
    verifyWebhookSignature(rawBody: string, headerSignature: string): boolean {
      if (!this.webhookSecret) return true; // pas de vérif si secret absent
      const hmac = crypto
        .createHmac('sha256', this.webhookSecret)
        .update(rawBody, 'utf8')
        .digest('hex');
      return crypto.timingSafeEqual(
        Buffer.from(hmac),
        Buffer.from(headerSignature),
      );
    }
  }
  