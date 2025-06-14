/* ───────── src/document/yousign/yousign.service.ts ───────── */
import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { FormData }  from 'undici';           // npm i undici
import * as fs       from 'node:fs/promises';
import * as path     from 'node:path';
import * as crypto   from 'node:crypto';
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
  private readonly logger  = new Logger(YousignService.name);

  /** ✅ racine correcte */
  private readonly baseUrl =
    process.env.YOUSIGN_API_URL ??
    'https://api.yousign.com/api_public/v3';

  private readonly apiKey        = process.env.YOUSIGN_API_KEY!;
  private readonly webhookSecret = process.env.YOUSIGN_WEBHOOK_SECRET ?? '';

  /* --------------------------------------------------------- *
   * 1. Upload du PDF
   * --------------------------------------------------------- */
  private async uploadFile(filePath: string): Promise<string> {
    const form   = new FormData();
    const buffer = await fs.readFile(filePath);

    /** on fournit un **Blob** pour satisfaire undici */
    const blob = new Blob([buffer], { type: 'application/pdf' });
    form.append('file', blob, path.basename(filePath));

    const res = await fetch(`${this.baseUrl}/files`, {
      method:  'POST',
      headers: { Authorization: `Bearer ${this.apiKey}` },
      body:    form as any,                      // BodyInit compatible
    });

    if (!res.ok) {
      this.logger.error(await res.text());
      throw new InternalServerErrorException('Upload fichier Yousign échoué');
    }
    return (await res.json() as UploadedFileRes).id;
  }

  /* --------------------------------------------------------- *
   * 2. Création de la procédure + membres
   * --------------------------------------------------------- */
  async createProcedure(consent: ConsentDocument, filePath: string) {
    const fileId = await this.uploadFile(filePath);

    const body = {
      name:        consent.name,
      description: `Signature du consentement ${consent.name}`,
      ordered:     true,
      webhook: {
        url:     `${process.env.BACKEND_PUBLIC_URL}/documents/yousign/webhook`,
        method:  'POST',
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
      method:  'POST',
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

    const data      = await res.json() as CreatedProcedureRes;
    const secretary = data.members.find(m => m.customId === 'SECRETARY_MEMBER');
    if (!secretary) {
      throw new InternalServerErrorException('Member secrétaire introuvable');
    }
    return { id: data.id, secretarySignUrl: secretary.signatureLink };
  }

  /* --------------------------------------------------------- *
   * 3. URL de signature d’un membre
   * --------------------------------------------------------- */
  async getMemberSignUrl(procId: string, isSecretary: boolean) {
    const res = await fetch(`${this.baseUrl}/procedures/${procId}`, {
      headers: { Authorization: `Bearer ${this.apiKey}` },
    });
    if (!res.ok) throw new InternalServerErrorException('Procédure introuvable');

    const data   = await res.json() as CreatedProcedureRes;
    const member = data.members.find(m =>
      isSecretary ? m.customId === 'SECRETARY_MEMBER'
                  : m.customId === 'PARENT_MEMBER',
    );
    if (!member) throw new InternalServerErrorException('Member introuvable');
    return member.signatureLink;
  }

  /* --------------------------------------------------------- *
   * 4. Téléchargement du PDF final signé
   * --------------------------------------------------------- */
  async downloadFinalFile(procId: string, dest: string) {
    const res = await fetch(`${this.baseUrl}/procedures/${procId}/download`, {
      headers: { Authorization: `Bearer ${this.apiKey}` },
    });
    if (!res.ok) throw new InternalServerErrorException('Download PDF échoué');

    const buffer = Buffer.from(await res.arrayBuffer());
    await fs.writeFile(dest, buffer);
    this.logger.log(`PDF final téléchargé ➜ ${dest}`);
  }

  /* --------------------------------------------------------- *
   * 5. Validation de la signature HMAC
   * --------------------------------------------------------- */
  verifyWebhookSignature(rawBody: string, headerSig: string): boolean {
    if (!this.webhookSecret) return true;  // pas de secret → pas de check
    const hmac = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(rawBody, 'utf8')
      .digest('hex');
    return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(headerSig));
  }
}
