/* ───────── src/document/yousign/yousign.service.ts ───────── */
import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConsentDocument } from '@prisma/client';
import { FormData } from 'undici';
import * as fs   from 'node:fs/promises';
import * as path from 'node:path';
import * as crypto from 'node:crypto';

/** réponses typées très simplifiées */
interface SigRequestRes   { id: string }
interface DocumentRes     { id: string }
interface SignerRes       { id: string; embedded_url?: string }

@Injectable()
export class YousignService {
  private readonly log = new Logger(YousignService.name);

  /* --- configuration ---------------------------------------------------- */
  private readonly BASE = process.env.YOUSIGN_API_URL || 'https://api-sandbox.yousign.app/v3';
  private readonly KEY  = process.env.YOUSIGN_API_KEY!;               // clé “API v3” (sandbox)
  private readonly HOOK = process.env.YOUSIGN_WEBHOOK_SECRET ?? '';

  /* helper fetch ---------------------------------------------------------- */
  private async call<T>(
    endpoint: string,
    init: RequestInit & { json?: any } = {},
  ): Promise<T> {
    const { json, ...opts } = init;
    const res = await fetch(`${this.BASE}/${endpoint}`, {
      ...opts,
      headers: {
        Authorization: `Bearer ${this.KEY}`,
        Accept: 'application/json',
        ...(json && { 'Content-Type': 'application/json' }),
        ...(init.headers || {}),
      },
      body: json ? JSON.stringify(json) : init.body,
    });

    if (!res.ok) {
      this.log.error(await res.text());
      throw new InternalServerErrorException('Appel Yousign échoué');
    }
    return res.json() as Promise<T>;
  }

  /* 1️⃣  Crée le “signature request” ------------------------------------- */
  private createSignatureRequest(consent: ConsentDocument) {
    return this.call<SigRequestRes>('signature_requests', {
      method: 'POST',
      json: {
        name:        consent.name,
        delivery_mode: 'email',     // pas d’e-mail envoyés car on mettra des signers sans mail
        timezone:    'Europe/Paris',
        webhook: {
          url: `${process.env.BACKEND_PUBLIC_URL}/documents/yousign/webhook`,
          method: 'POST',
          headers: { 'x-yousign-hook-signature': this.HOOK },
        },
      },
    });
  }

  /* 2️⃣  Upload du PDF dans cette signature_request ---------------------- */
  private async uploadDocument(reqId: string, filePath: string) {
    const fd   = new FormData();
    fd.append(
      'file',
      new Blob([await fs.readFile(filePath)], { type: 'application/pdf' }),
      path.basename(filePath),
    );
    fd.append('nature', 'signable_document');
    fd.append('parse_anchors', 'true');

    return this.call<DocumentRes>(
      `signature_requests/${reqId}/documents`,
      { method: 'POST', body: fd as any, headers: (fd as any).getHeaders?.() }
    );
  }

  /* 3️⃣  Ajoute un signer (secrétaire ou parent) ------------------------- */
  private addSigner(reqId: string, opts: {
    customId: 'SECRETARY_MEMBER' | 'PARENT_MEMBER',
    firstName: string,
    lastName: string,
    email?: string,
  }) {
    return this.call<SignerRes>(`signature_requests/${reqId}/signers`, {
      method: 'POST',
      json: {
        info: {
          first_name: opts.firstName,
          last_name : opts.lastName,
          email      : opts.email || 'no-reply@example.com',
          locale     : 'fr',
        },
        custom_id: opts.customId,
        redirect_url: process.env.FRONTEND_PUBLIC_URL || 'http://localhost:5173',
      },
    });
  }

  /* 4️⃣  Lance le “signature_request” (status = “pending”) --------------- */
  private activateRequest(reqId: string) {
    return this.call(`signature_requests/${reqId}/activate`, { method: 'POST' });
  }

  /* ========= point d’entrée appelé depuis DocumentService ============== */
  async createProcedure(consent: ConsentDocument, filePath: string) {
    /* étape 1 */
    const req = await this.createSignatureRequest(consent);

    /* étape 2 : doc */
    await this.uploadDocument(req.id, filePath);

    /* étape 3 : signers */
    const secretarySigner = await this.addSigner(req.id, {
      customId : 'SECRETARY_MEMBER',
      firstName: 'Secrétaire',
      lastName : 'IME',
    });
    await this.addSigner(req.id, {
      customId : 'PARENT_MEMBER',
      firstName: 'Parent',
      lastName : 'IME',
    });

    /* étape 4 : activation */
    await this.activateRequest(req.id);

    /* URL de signature embarquée du secrétaire */
    return {
      id: req.id,
      secretarySignUrl: secretarySigner.embedded_url!,
    };
  }

  /* Récupère l’URL (embedded_url) pour secrétaire / parent --------------- */
  async getMemberSignUrl(reqId: string, isSecretary: boolean) {
    const signers = await this.call<{ items: SignerRes[] }>(
      `signature_requests/${reqId}/signers`,
    );
    const signer = signers.items.find(s =>
      isSecretary ? s.customId === 'SECRETARY_MEMBER'
                  : s.customId === 'PARENT_MEMBER',
    );
    if (!signer?.embedded_url) {
      throw new InternalServerErrorException('URL de signature introuvable');
    }
    return signer.embedded_url;
  }

  /* Téléchargement du PDF final ----------------------------------------- */
  async downloadFinalFile(reqId: string, dest: string) {
    const doc = await this.call<{ id: string; download_url: string }>(
      `signature_requests/${reqId}/documents?nature=signable_document`
    );
    const r = await fetch(doc.download_url);
    if (!r.ok) throw new InternalServerErrorException('Download PDF échoué');
    await fs.writeFile(dest, Buffer.from(await r.arrayBuffer()));
    this.log.log(`PDF final téléchargé ➜ ${dest}`);
  }

  /* Vérif webhook -------------------------------------------------------- */
  verifyWebhookSignature(raw: string, sig: string) {
    if (!this.HOOK) return true;
    const h = crypto.createHmac('sha256', this.HOOK).update(raw).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(h), Buffer.from(sig));
  }
}
