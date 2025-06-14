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

/* ▸ réponses simplifiées */
interface SignatureRequestRes { id: string }
interface DocumentRes         { id: string }
interface SignerRes           { id: string; custom_id: string; embedded_url?: string }

@Injectable()
export class YousignService {
  private readonly log = new Logger(YousignService.name);

  /* ▸ configuration (.env) ------------------------------------ */
  private readonly BASE = (process.env.YOUSIGN_API_URL ??
    'https://api-sandbox.yousign.app/v3').trim();
  private readonly KEY  = (process.env.YOUSIGN_API_KEY  ?? '').trim();
  private readonly HOOK = (process.env.YOUSIGN_WEBHOOK_SECRET ?? '').trim();

  constructor() {
    this.log.log(`Yousign → ${this.BASE}  |  token ${this.KEY.slice(0, 6)}…`);
  }

  /* ▸ helper fetch (Bearer <API-KEY>) -------------------------- */
  private async call<T>(
    endpoint: string,
    init: RequestInit & { json?: any } = {},
  ): Promise<T> {
    const { json, ...opts } = init;
    const res = await fetch(`${this.BASE}/${endpoint}`, {
      ...opts,
      headers: {
        Authorization : `Bearer ${this.KEY}`,
        Accept        : 'application/json',
        ...(json && { 'Content-Type': 'application/json' }),
        ...(init.headers || {}),
      },
      body: json ? JSON.stringify(json) : init.body,
    });

    if (!res.ok) {
      this.log.error(
        `Yousign ${endpoint} → ${res.status}: ${await res.text()}`,
      );
      throw new InternalServerErrorException('Appel Yousign échoué');
    }
    return res.json() as Promise<T>;
  }

  /* 1️⃣  Création de la signature-request ---------------------- */
  private createSignatureRequest(consent: ConsentDocument) {
    return this.call<SignatureRequestRes>('signature_requests', {
      method: 'POST',
      json: {
        name         : consent.name,
        delivery_mode: 'email',
        timezone     : 'Europe/Paris',
        /* plus de champ “webhook” : à configurer sur le dashboard */
      },
    });
  }

  /* 2️⃣  Upload PDF ------------------------------------------- */
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

  /* 3️⃣  Ajout d’un signer ------------------------------------ */
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
        custom_id          : cfg.custom_id,
        signature_level    : 'electronic_signature', // valeurs par défaut, mais explicites
        authentication_mode: 'email',
        /* 🔸 redirect_url n’est PAS accepté par l’API v3 */
      },
    });
  }

  /* 4️⃣  Activation ------------------------------------------ */
  private activateRequest(reqId: string) {
    return this.call(`signature_requests/${reqId}/activate`, { method: 'POST' });
  }

  /* ╔════════════════════════════════════════╗
     ║      API publique (DocumentService)     ║
     ╚════════════════════════════════════════╝ */
  async createProcedure(consent: ConsentDocument, filePath: string) {
    /* 1. request + doc */
    const req = await this.createSignatureRequest(consent);
    await this.uploadDocument(req.id, filePath);

    /* 2. signers */
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

    /* 3. activation */
    await this.activateRequest(req.id);

    /* 4. lien de signature secrétaire */
    return { id: req.id, secretarySignUrl: secretary.embedded_url! };
  }

  /* ▸ URL embarquée d’un signer ------------------------------ */
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

  /* ▸ Téléchargement PDF final ------------------------------- */
  async downloadFinalFile(reqId: string, dest: string) {
    const { download_url } = await this.call<{ download_url: string }>(
      `signature_requests/${reqId}/documents?nature=signable_document`,
    );
    const r = await fetch(download_url);
    if (!r.ok) throw new InternalServerErrorException('Download PDF échoué');
    await fs.writeFile(dest, Buffer.from(await r.arrayBuffer()));
    this.log.log(`PDF final téléchargé ➜ ${dest}`);
  }

  /* ▸ HMAC webhook ------------------------------------------ */
  verifyWebhookSignature(raw: string, sig: string) {
    if (!this.HOOK) return true;
    const h = crypto.createHmac('sha256', this.HOOK).update(raw).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(h), Buffer.from(sig));
  }
}
