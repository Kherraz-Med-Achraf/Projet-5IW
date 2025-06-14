import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { FormData } from 'undici';               // npm i undici  &&  npm i -D @types/undici
import { createReadStream } from 'node:fs';
import * as fs   from 'node:fs/promises';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import { ConsentDocument, Role } from '@prisma/client';

interface UploadedFileRes   { id: string }
interface CreatedProcedureRes {
  id: string;
  members: { id: string; signatureLink: string; customId: string }[];
}

@Injectable()
export class YousignService {
  private readonly logger = new Logger(YousignService.name);

  private readonly baseUrl =
    process.env.YOUSIGN_API_URL ?? 'https://api.yousign.com/v3';
  private readonly apiKey        = process.env.YOUSIGN_API_KEY!;
  private readonly webhookSecret = process.env.YOUSIGN_WEBHOOK_SECRET ?? '';

  /* ----------------------------------------------------------- *
   * 1. Upload PDF vers Yousign
   * ----------------------------------------------------------- */
  private async uploadFile(filePath: string): Promise<string> {
    const form = new FormData();
    const stream = createReadStream(filePath);

    // filename en 3ᵉ arg ➜ Yousign garde le nom d’origine
    form.append('file', stream, path.basename(filePath));

    const res = await fetch(`${this.baseUrl}/files`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.apiKey}` },
      body: form as any,                     // BodyInit compatible (TS 4.9+)
    });

    if (!res.ok) {
      const err = await res.text();
      this.logger.error(err);
      throw new InternalServerErrorException('Upload fichier Yousign échoué');
    }

    const data = (await res.json()) as UploadedFileRes;
    return data.id;
  }

  /* ----------------------------------------------------------- *
   * 2. Création procédure + membres
   * ----------------------------------------------------------- */
  async createProcedure(consent: ConsentDocument, filePath: string) {
    const fileId = await this.uploadFile(filePath);

    const body = {
      name: consent.name,
      description: `Signature du consentement ${consent.name}`,
      ordered: true,
      webhook: {
        url: `${process.env.BACKEND_PUBLIC_URL}/documents/yousign/webhook`,
        method: 'POST',
        headers: { 'x-yousign-hook-signature': this.webhookSecret },
      },
      members: [
        {
          firstname: 'Secrétaire',
          lastname:  'IME',
          email:     '',
          customId:  'SECRETARY_MEMBER',
          role:      Role.SECRETARY,
          fileObjects: [{
            file: fileId, page: 1, position: '150,500,200,550',
          }],
        },
        {
          firstname: 'Parent',
          lastname:  'IME',
          email:     '',
          customId:  'PARENT_MEMBER',
          role:      Role.PARENT,
          fileObjects: [{
            file: fileId, page: 1, position: '150,400,200,450',
          }],
        },
      ],
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
      const err = await res.text();
      this.logger.error(err);
      throw new InternalServerErrorException('Création procédure Yousign échouée');
    }

    const data = (await res.json()) as CreatedProcedureRes;
    const secretary = data.members.find(m => m.customId === 'SECRETARY_MEMBER');
    if (!secretary) throw new InternalServerErrorException('Member secrétaire introuvable');

    return { id: data.id, secretarySignUrl: secretary.signatureLink };
  }

  /* ----------------------------------------------------------- *
   * 3. URL signature secrétaire / parent
   * ----------------------------------------------------------- */
  async getMemberSignUrl(procId: string, isSecretary: boolean) {
    const res = await fetch(`${this.baseUrl}/procedures/${procId}`, {
      headers: { Authorization: `Bearer ${this.apiKey}` },
    });
    if (!res.ok) throw new InternalServerErrorException('Procédure introuvable');

    const data = (await res.json()) as CreatedProcedureRes;
    const wanted = data.members.find(m =>
      isSecretary ? m.customId === 'SECRETARY_MEMBER'
                  : m.customId === 'PARENT_MEMBER',
    );
    if (!wanted) throw new InternalServerErrorException('Member introuvable');
    return wanted.signatureLink;
  }

  /* ----------------------------------------------------------- *
   * 4. Téléchargement PDF final
   * ----------------------------------------------------------- */
  async downloadFinalFile(procId: string, dest: string) {
    const res = await fetch(`${this.baseUrl}/procedures/${procId}/download`, {
      headers: { Authorization: `Bearer ${this.apiKey}` },
    });
    if (!res.ok) throw new InternalServerErrorException('Download PDF échoué');

    const buffer = Buffer.from(await res.arrayBuffer());
    await fs.writeFile(dest, buffer);
    this.logger.log(`PDF final téléchargé ➜ ${dest}`);
  }

  /* ----------------------------------------------------------- *
   * 5. Vérification signature HMAC webhook
   * ----------------------------------------------------------- */
  verifyWebhookSignature(raw: string, sig: string): boolean {
    if (!this.webhookSecret) return true;
    const hash = crypto.createHmac('sha256', this.webhookSecret)
                       .update(raw, 'utf8').digest('hex');
    return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(sig));
  }
}
