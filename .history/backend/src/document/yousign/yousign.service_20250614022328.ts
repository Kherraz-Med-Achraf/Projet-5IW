/* ───────── src/document/yousign/yousign.service.ts ───────── */
import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConsentDocument } from '@prisma/client';
import { FormData } from 'undici';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as crypto from 'node:crypto';

/* réponses utiles (fortement simplifiées) */
interface SignatureRequestRes { id: string }
interface DocumentRes         { id: string }
interface SignerRes           { id: string; custom_id: string; embedded_url?: string }

@Injectable()
export class YousignService {
  private readonly log  = new Logger(YousignService.name);

  /* ─────── configuration (.env) ─────── */
  private readonly BASE = (process.env.YOUSIGN_API_URL ??
    'https://api-sandbox.yousign.app/v3').trim();
  private readonly KEY  = (process.env.YOUSIGN_API_KEY  ?? '').trim();
  private readonly HOOK = (process.env.YOUSIGN_WEBHOOK_SECRET ?? '').trim();

  constructor() {
    this.log.log(`Yousign → ${this.BASE}  |  token ${this.KEY.slice(0, 6)}…`);
  }

  /* helper fetch → Bearer {API-KEY} */
  private async call<T>(
    endpoint: string,
    init: RequestInit & { json?: any } = {},
  ): Promise<T> {
    const { json, ...opts } = init;

    const res = await fetch(`${this.BASE}/${endpoint}`, {
      ...opts,
      headers: {
        Authorization: `Bearer ${this.KEY}`,
        Accept:        'application/json',
        ...(json && { 'Content-Type': 'application/json' }),
        ...(init.headers || {}),
      },
      body: json ? JSON.stringify(json) : init.body,
    });

    if (!res.ok) {
      const txt = await res.text();
      this.log.error(`Yousign ${endpoint} → ${res.status}: ${txt}`);
      throw new InternalServerErrorException('Appel Yousign échoué');
    }
    return res.json() as Promise<T>;
  }

  /* ───────── 1. Création de la signature-request ───────── */
  private createSignatureRequest(consent: ConsentDocument) {
    return this.call<SignatureRequestRes>('signature_requests', {
      method: 'POST',
      json: {
        name         : consent.name,
        delivery_mode: 'email',          // ou "none" si vous notifiez vous-même
        timezone     : 'Europe/Paris',
        // 🔸 plus de champ « webhook » ici : à configurer dans le dashboard
      },
    });
  }

  /* ───────── 2. Upload du PDF ───────── */
  private async uploadDocument(reqId: string, filePath: string) {
    const fd = new FormData();
    fd.append(
      'file',
      new Blob([await fs.readFile(filePath)], { type: 'application/pdf' }),
      path.basename(filePath),
    );
    fd.append('nature', 'signable_document');

    return this.call<DocumentRes>(
      `signature_requests/${reqId}/documents`,
      { method: 'POST', body: fd as any },
    );
  }

  /* ───────── 3. Ajout d’un signer ───────── */
  private addSigner(
    reqId: string,
    cfg: { custom_id: string; firstName: string; lastName: string },
  ) {
    return this.call<SignerRes>(`signature_requests/${reqId}/signers`, {
      method: 'POST',
      json: {
        info: {
          first_name: cfg.firstName,
          last_name : cfg.lastName,
          email     : 'no-reply@example.com',
          locale    : 'fr',
        },
        custom_id   : cfg.custom_id,
        redirect_url: process.env.FRONTEND_PUBLIC_URL || 'http://localhost:5173',
      },
    });
  }

  /* ───────── 4. Activation ───────── */
  private activateRequest(reqId: string) {
    return this.call(`signature_requests/${reqId}/activate`, { method: 'POST' });
  }

  /* ░░ API utilisée par DocumentService ░░ */
  async createProcedure(consent: ConsentDocument, filePath: string) {
    const req = await this.createSignatureRequest(consent);
    await this.uploadDocument(req.id, filePath);

    const secretary = await this.addSigner(req.id, {
      custom_id: 'SECRETARY_MEMBER',
      firstName: 'Secrétaire',
      lastName : 'IME',
    });
    await this.addSigner(req.id, {
      custom_id: 'PARENT_MEMBER',
      firstName: 'Parent',
      lastName : 'IME',
    });

    await this.activateRequest(req.id);

    return { id: req.id, secretarySignUrl: secretary.embedded_url! };
  }

  /* Récupération du lien embarqué d’un signer */
  async getMemberSignUrl(reqId: string, isSecretary: boolean) {
    const { items } = await this.call<{ items: SignerRes[] }>(
      `signature_requests/${reqId}/signers`,
    );

    const signer = items.find(s =>
      isSecretary ? s.custom_id === 'SECRETARY_MEMBER'
                  : s.custom_id === 'PARENT_MEMBER',
    );
    if (!signer?.embedded_url)
      throw new InternalServerErrorException('URL de signature introuvable');
    return signer.embedded_url;
  }

  /* Téléchargement du PDF final */
  async downloadFinalFile(reqId: string, dest: string) {
    const { download_url } = await this.call<{ download_url: string }>(
      `signature_requests/${reqId}/documents?nature=signable_document`,
    );
    const r = await fetch(download_url);
    if (!r.ok) throw new InternalServerErrorException('Download PDF échoué');
    await fs.writeFile(dest, Buffer.from(await r.arrayBuffer()));
    this.log.log(`PDF final téléchargé ➜ ${dest}`);
  }

  /* Vérification HMAC (optionnelle) */
  verifyWebhookSignature(raw: string, sig: string) {
    if (!this.HOOK) return true;
    const h = crypto.createHmac('sha256', this.HOOK).update(raw).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(h), Buffer.from(sig));
  }
}
