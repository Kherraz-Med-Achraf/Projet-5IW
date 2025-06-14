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

interface SignatureRequestRes { id: string }
interface DocumentRes         { id: string }
interface SignerRes           { id: string; embedded_url?: string }

@Injectable()
export class YousignService {
  private readonly BASE = (process.env.YOUSIGN_API_URL ?? 'https://api-sandbox.yousign.app/v3').trim();
  private readonly KEY  = (process.env.YOUSIGN_API_KEY  ?? '').trim();
  private readonly HOOK = (process.env.YOUSIGN_WEBHOOK_SECRET ?? '').trim();
  private readonly log  = new Logger(YousignService.name);

  /* -------- helper HTTP -------- */
  private async call<T>(
    endpoint: string,
    init: RequestInit & { json?: any } = {},
  ): Promise<T> {
    const { json, ...opts } = init;
    const r = await fetch(`${this.BASE}/${endpoint}`, {
      ...opts,
      headers: {
        Authorization : `Bearer ${this.KEY}`,
        Accept        : 'application/json',
        ...(json && { 'Content-Type': 'application/json' }),
        ...(init.headers || {}),
      },
      body: json ? JSON.stringify(json) : init.body,
    });
    if (!r.ok) {
      this.log.error(`Yousign ${endpoint} → ${r.status}: ${await r.text()}`);
      throw new InternalServerErrorException('Appel Yousign échoué');
    }
    return r.json() as Promise<T>;
  }

  /* 1️⃣  Création de la signature-request */
  private createSignatureRequest(consent: ConsentDocument) {
    return this.call<SignatureRequestRes>('signature_requests', {
      method: 'POST',
      json: {
        name         : consent.name,
        delivery_mode: 'email',
        timezone     : 'Europe/Paris',
      },
    });
  }

  /* 2️⃣  Upload du PDF */
  private async uploadDocument(reqId: string, filePath: string) {
    const fd   = new FormData();
    const blob = new Blob([await fs.readFile(filePath)], { type: 'application/pdf' });
    const base = path.basename(filePath);
    const filename = base.toLowerCase().endsWith('.pdf') ? base : `${base}.pdf`;

    fd.append('file', blob, filename);
    fd.append('nature', 'signable_document');

    return this.call<DocumentRes>(
      `signature_requests/${reqId}/documents`,
      { method: 'POST', body: fd as any },
    );
  }

  /* 3️⃣  Ajout d’un signer (signature simple + no_code) */
  private addSigner(reqId: string, name: { first: string; last: string }) {
    return this.call<SignerRes>(
      `signature_requests/${reqId}/signers`,
      {
        method: 'POST',
        json: {
          info: {
            first_name: name.first,
            last_name : name.last,
            email     : 'no-reply@example.com',
            locale    : 'fr',
          },
          signature_level   : 'simple',   // <- niveau
          authentication_mode: 'no_code', // <- obligatoire pour ‘simple’
        },
      },
    );
  }

  /* 4️⃣  Activation */
  private activateRequest(reqId: string) {
    return this.call(`signature_requests/${reqId}/activate`, { method: 'POST' });
  }

  /* ░█  API publique  █░ */
  async createProcedure(consent: ConsentDocument, filePath: string) {
    const req = await this.createSignatureRequest(consent);
    await this.uploadDocument(req.id, filePath);

    const secretary = await this.addSigner(req.id, { first: 'Secrétaire', last: 'IME' });
    await this.addSigner(req.id, { first: 'Parent', last: 'IME' });

    await this.activateRequest(req.id);
    return { id: req.id, secretarySignUrl: secretary.embedded_url! };
  }

  async getMemberSignUrl(reqId: string, isSecretary: boolean) {
    const { items } = await this.call<{ items: SignerRes[] }>(
      `signature_requests/${reqId}/signers`,
    );
    const signer = items[isSecretary ? 0 : 1];
    if (!signer?.embedded_url) {
      throw new InternalServerErrorException('URL introuvable');
    }
    return signer.embedded_url;
  }

  async downloadFinalFile(reqId: string, dest: string) {
    const { download_url } = await this.call<{ download_url: string }>(
      `signature_requests/${reqId}/documents?nature=signable_document`,
    );
    const r = await fetch(download_url);
    if (!r.ok) throw new InternalServerErrorException('Download PDF échoué');
    await fs.writeFile(dest, Buffer.from(await r.arrayBuffer()));
  }

  verifyWebhookSignature(raw: string, sig: string) {
    if (!this.HOOK) return true;
    const h = crypto.createHmac('sha256', this.HOOK).update(raw).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(h), Buffer.from(sig));
  }
}
