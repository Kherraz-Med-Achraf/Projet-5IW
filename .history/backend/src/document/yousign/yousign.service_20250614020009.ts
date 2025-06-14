/* ───────── src/document/yousign/yousign.service.ts ───────── */
import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConsentDocument, Role } from '@prisma/client';
import { FormData } from 'undici';          //  npm i undici
import * as fs     from 'node:fs/promises';
import * as path   from 'node:path';
import * as crypto from 'node:crypto';

interface FileRes      { id: string }
interface ProcedureRes {
  id: string;
  members: { id: string; signatureLink: string; customId: string }[];
}

@Injectable()
export class YousignService {
  private readonly log  = new Logger(YousignService.name);

  /* ══════════════════════════════════════════════════════════════
     CONFIGURATION
     ══════════════════════════════════════════════════════════════ */
  private readonly base =
    process.env.YOUSIGN_API_URL ?? 'https://staging-api.yousign.com/v3'; // ✅ v3 sandbox
  private readonly key  = process.env.YOUSIGN_API_KEY!;                  // clé API v3
  private readonly hook = process.env.YOUSIGN_WEBHOOK_SECRET ?? '';

  /* ══════════════════════════════════════════════════════════════
     1️⃣  Upload PDF  (multipart /files)
     ══════════════════════════════════════════════════════════════ */
  private async uploadFile(filePath: string): Promise<string> {
    const form   = new FormData();
    const buffer = await fs.readFile(filePath);
    const blob   = new Blob([buffer], { type: 'application/pdf' }); // undici ↔ Blob

    form.append('file', blob, path.basename(filePath));             // garde le nom original

    const res = await fetch(`${this.base}/files`, {
      method : 'POST',
      headers: { Authorization: `Bearer ${this.key}` },
      body   : form as any,
    });

    if (!res.ok) {
      this.log.error(await res.text());
      throw new InternalServerErrorException('Upload fichier Yousign échoué');
    }
    return (await res.json() as FileRes).id;
  }

  /* ══════════════════════════════════════════════════════════════
     2️⃣  Création procédure + membres
     ══════════════════════════════════════════════════════════════ */
  async createProcedure(consent: ConsentDocument, filePath: string) {
    const fileId = await this.uploadFile(filePath);

    const body = {
      name       : consent.name,
      description: `Signature du consentement ${consent.name}`,
      ordered    : true,
      webhook    : {
        url    : `${process.env.BACKEND_PUBLIC_URL}/documents/yousign/webhook`,
        method : 'POST',
        headers: { 'x-yousign-hook-signature': this.hook },
      },
      members: [
        {
          firstname  : 'Secrétaire',
          lastname   : 'IME',
          email      : '',
          customId   : 'SECRETARY_MEMBER',
          role       : Role.SECRETARY,
          fileObjects: [{ file: fileId, page: 1, position: '150,500,200,550' }],
        },
        {
          firstname  : 'Parent',
          lastname   : 'IME',
          email      : '',
          customId   : 'PARENT_MEMBER',
          role       : Role.PARENT,
          fileObjects: [{ file: fileId, page: 1, position: '150,400,200,450' }],
        },
      ],
    };

    const res = await fetch(`${this.base}/procedures`, {
      method : 'POST',
      headers: {
        Authorization : `Bearer ${this.key}`,
        'Content-Type': 'application/json',
        Accept        : 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      this.log.error(await res.text());
      throw new InternalServerErrorException('Création procédure Yousign échouée');
    }

    const data = await res.json() as ProcedureRes;
    const sec  = data.members.find(m => m.customId === 'SECRETARY_MEMBER');
    if (!sec) throw new InternalServerErrorException('Member secrétaire introuvable');

    return { id: data.id, secretarySignUrl: sec.signatureLink };
  }

  /* ══════════════════════════════════════════════════════════════
     3️⃣  URL de signature d’un membre
     ══════════════════════════════════════════════════════════════ */
  async getMemberSignUrl(procId: string, isSecretary: boolean) {
    const res = await fetch(`${this.base}/procedures/${procId}`, {
      headers: { Authorization: `Bearer ${this.key}`, Accept: 'application/json' },
    });
    if (!res.ok) throw new InternalServerErrorException('Procédure introuvable');

    const data = await res.json() as ProcedureRes;
    const m = data.members.find(v =>
      isSecretary ? v.customId === 'SECRETARY_MEMBER'
                  : v.customId === 'PARENT_MEMBER');
    if (!m) throw new InternalServerErrorException('Member introuvable');
    return m.signatureLink;
  }

  /* ══════════════════════════════════════════════════════════════
     4️⃣  Téléchargement PDF final
     ══════════════════════════════════════════════════════════════ */
  async downloadFinalFile(procId: string, dest: string) {
    const res = await fetch(`${this.base}/procedures/${procId}/download`, {
      headers: { Authorization: `Bearer ${this.key}` },
    });
    if (!res.ok) throw new InternalServerErrorException('Download PDF échoué');

    const buf = Buffer.from(await res.arrayBuffer());
    await fs.writeFile(dest, buf);
    this.log.log(`PDF final téléchargé ➜ ${dest}`);
  }

  /* ══════════════════════════════════════════════════════════════
     5️⃣  Vérif HMAC webhook
     ══════════════════════════════════════════════════════════════ */
  verifyWebhookSignature(raw: string, sig: string): boolean {
    if (!this.hook) return true;
    const h = crypto.createHmac('sha256', this.hook).update(raw, 'utf8').digest('hex');
    return crypto.timingSafeEqual(Buffer.from(h), Buffer.from(sig));
  }
}
