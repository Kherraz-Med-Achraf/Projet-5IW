/* ───────── src/document/yousign/yousign.service.ts ───────── */
import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import * as fs      from 'node:fs/promises';
import * as path    from 'node:path';
import * as crypto  from 'node:crypto';
import { ConsentDocument, Role } from '@prisma/client';

interface UploadedFileRes   { id: string }
interface CreatedProcedureRes {
  id: string;
  members: { id: string; signatureLink: string; customId: string }[];
}

@Injectable()
export class YousignService {
  private readonly logger = new Logger(YousignService.name);

  /** racine API v2 (sandbox) */
  private readonly baseUrl =
    process.env.YOUSIGN_API_URL ?? 'https://staging-api.yousign.com/v2';

  private readonly apiKey        = process.env.YOUSIGN_API_KEY!;
  private readonly webhookSecret = process.env.YOUSIGN_WEBHOOK_SECRET ?? '';

  /* ----------------------------------------------------------- *
   * 1. Upload PDF (v2 → JSON base64, pas multipart)
   * ----------------------------------------------------------- */
  private async uploadFile(filePath: string): Promise<string> {
    const buffer = await fs.readFile(filePath);
    const body   = {
      name:        path.basename(filePath),
      content:     buffer.toString('base64'),        // ⬅️ base64
      contentType: 'application/pdf',
    };

    const res = await fetch(`${this.baseUrl}/files`, {
      method:  'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      this.logger.error(await res.text());
      throw new InternalServerErrorException('Upload fichier Yousign échoué');
    }
    return (await res.json() as UploadedFileRes).id;
  }

  /* ----------------------------------------------------------- *
   * 2. Création procédure + membres
   * ----------------------------------------------------------- */
  async createProcedure(consent: ConsentDocument, filePath: string) {
    const fileId = await this.uploadFile(filePath);

    const body = {
      name:        consent.name,
      description: `Signature du consentement ${consent.name}`,
      template:    false,
      ordered:     true,
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
      /* webhooks config v2 */
      config: {
        webhooks: [{
          url:    `${process.env.BACKEND_PUBLIC_URL}/documents/yousign/webhook`,
          method: 'POST',
          events: ['procedure.finished', 'procedure.member.finished'],
          security: { secret: this.webhookSecret },
        }],
        emails: { procedure_started: false, procedure_finished: false },
      },
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

  /* ----------------------------------------------------------- *
   * 3. URL signature d’un membre
   * ----------------------------------------------------------- */
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
   * 5. Vérif signature webhook (HMAC)
   * ----------------------------------------------------------- */
  verifyWebhookSignature(raw: string, sig: string): boolean {
    if (!this.webhookSecret) return true;
    const hash = crypto.createHmac('sha256', this.webhookSecret)
                       .update(raw, 'utf8').digest('hex');
    return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(sig));
  }
}
