/* ───────── src/document/yousign/yousign.service.ts ───────── */
import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConsentDocument } from '@prisma/client';
import { FormData } from 'undici';
import * as fs     from 'node:fs/promises';
import * as path   from 'node:path';
import * as crypto from 'node:crypto';

/* réponses minimalistes */
interface SignatureRequestRes { id: string }
interface DocumentRes         { id: string }
interface SignerRes           { id: string; embedded_url?: string }

@Injectable()
export class YousignService {
  private readonly log  = new Logger(YousignService.name);

  private readonly BASE = (process.env.YOUSIGN_API_URL ??
    'https://api-sandbox.yousign.app/v3').trim();
  private readonly KEY  = (process.env.YOUSIGN_API_KEY ?? '').trim();
  private readonly HOOK = (process.env.YOUSIGN_WEBHOOK_SECRET ?? '').trim();
  private readonly FRONT =
    process.env.FRONTEND_PUBLIC_URL || 'http://localhost:5173';

  /* ╭── helper HTTP (Bearer) ───────────────────────────────╮ */
  private async call<T>(
    endpoint: string,
    init: RequestInit & { json?: unknown } = {},
  ): Promise<T> {
    const { json, ...opts } = init;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.KEY}`,
      Accept:        'application/json',
      ...(json ? { 'Content-Type': 'application/json' } : {}),
      ...(opts.headers as Record<string, string> | undefined),
    };

    const res = await fetch(`${this.BASE}/${endpoint}`, {
      ...opts,
      headers,
      body: json ? JSON.stringify(json) : opts.body,
    });

    if (!res.ok) {
      this.log.error(
        `Yousign ${endpoint} → ${res.status}: ${await res.text()}`,
      );
      throw new InternalServerErrorException('Appel Yousign échoué');
    }
    return res.json() as Promise<T>;
  }
  /* ╰────────────────────────────────────────────────────────╯ */

  /* 1️⃣  Création Signature-request */
  private createSignatureRequest(consent: ConsentDocument) {
    return this.call<SignatureRequestRes>('signature_requests', {
      method: 'POST',
      json  : {
        name         : consent.name,
        delivery_mode: 'email',
        timezone     : 'Europe/Paris',
      },
    });
  }

  /* 2️⃣  Upload PDF */
  private async uploadDocument(reqId: string, filePath: string) {
    const blob = new Blob([await fs.readFile(filePath)], {
      type: 'application/pdf',
    });
    const filename = path.basename(filePath).replace(/(\.pdf)?$/i, '.pdf');

    const fd = new FormData();
    fd.append('file', blob, filename);
    fd.append('nature', 'signable_document');

    return this.call<DocumentRes>(
      `signature_requests/${reqId}/documents`,
      { method: 'POST', body: fd as any },
    );
  }

  /* 3️⃣  Signer (simple + no_code) */
  private addSigner(
    reqId: string,
    { first, last, email }: { first: string; last: string; email: string },
  ) {
    return this.call<SignerRes>(
      `signature_requests/${reqId}/signers`,
      {
        method: 'POST',
        json  : {
          info: {
            first_name: first,
            last_name : last,
            email,
            locale    : 'fr',
          },
          signature_level   : 'simple',
          authentication_mode: 'no_code',     // ✅ champ correct
          redirect_url      : this.FRONT,
        },
      },
    );
  }

  /* 4️⃣  Activation */
  private activateRequest(reqId: string) {
    return this.call(`signature_requests/${reqId}/activate`, { method: 'POST' });
  }

  /* ███ API publique utilisée par DocumentService ███ */
  async createProcedure(
    consent: ConsentDocument,
    filePath: string,
    secretaryEmail: string,
    parentEmail: string,
  ) {
    const req = await this.createSignatureRequest(consent);
    await this.uploadDocument(req.id, filePath);

    const secretary = await this.addSigner(req.id, {
      first: 'Secrétaire',
      last : 'IME',
      email: secretaryEmail,
    });

    await this.addSigner(req.id, {
      first: 'Parent',
      last : 'IME',
      email: parentEmail,
    });

    await this.activateRequest(req.id);

    return { id: req.id, secretarySignUrl: secretary.embedded_url! };
  }

  /** URL embarquée (index 0 = secrétaire, 1 = parent) */
  async getMemberSignUrl(reqId: string, isSecretary: boolean) {
    const { items } = await this.call<{ items: SignerRes[] }>(
      `signature_requests/${reqId}/signers`,
    );
    const signer = items[isSecretary ? 0 : 1];
    if (!signer?.embedded_url)
      throw new InternalServerErrorException('URL de signature introuvable');
    return signer.embedded_url;
  }

  /* Téléchargement PDF signé */
  async downloadFinalFile(reqId: string, dest: string) {
    const { download_url } = await this.call<{ download_url: string }>(
      `signature_requests/${reqId}/documents?nature=signable_document`,
    );
    const r = await fetch(download_url);
    if (!r.ok) throw new InternalServerErrorException('Download PDF échoué');
    await fs.writeFile(dest, Buffer.from(await r.arrayBuffer()));
  }

  /* Vérification HMAC (optionnelle) */
  verifyWebhookSignature(raw: string, sig: string) {
    if (!this.HOOK) return true;
    const calc = crypto
      .createHmac('sha256', this.HOOK)
      .update(raw, 'utf8')
      .digest('hex');
    return crypto.timingSafeEqual(Buffer.from(calc), Buffer.from(sig));
  }
}
