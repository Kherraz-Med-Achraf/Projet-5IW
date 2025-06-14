/* ───────── src/document/yousign/yousign.service.ts ───────── */
import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConsentDocument } from '@prisma/client';
import { FormData }  from 'undici';
import * as fs       from 'node:fs/promises';
import * as path     from 'node:path';
import * as crypto   from 'node:crypto';

/* réponses utiles */
interface SignatureRequestRes { id: string }
interface DocumentRes         { id: string }
interface SignerRes           { id: string; embedded_url?: string }

@Injectable()
export class YousignService {
  private readonly log  = new Logger(YousignService.name);
  private readonly BASE = (process.env.YOUSIGN_API_URL  ?? 'https://api-sandbox.yousign.app/v3').trim();
  private readonly KEY  = (process.env.YOUSIGN_API_KEY   ?? '').trim();
  private readonly HOOK = (process.env.YOUSIGN_WEBHOOK_SECRET ?? '').trim();

  /* helper fetch -------------------------------------------------------- */
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
        ...init.headers,
      },
      body: json ? JSON.stringify(json) : init.body,
    });

    if (!r.ok) {
      this.log.error(`Yousign ${endpoint} → ${r.status}: ${await r.text()}`);
      throw new InternalServerErrorException('Appel Yousign échoué');
    }
    return r.json() as Promise<T>;
  }

  /* 1️⃣  création de la signature-request --------------------------------*/
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

  /* 2️⃣  upload PDF ------------------------------------------------------ */
  private async uploadDocument(reqId: string, filePath: string) {
    const fd   = new FormData();
    fd.append(
      'file',
      new Blob([await fs.readFile(filePath)], { type: 'application/pdf' }),
      path.basename(filePath).replace(/\.?$/, '.pdf'),      // s’assure d’avoir .pdf
    );
    fd.append('nature', 'signable_document');

    return this.call<DocumentRes>(
      `signature_requests/${reqId}/documents`,
      { method: 'POST', body: fd as any },
    );
  }

  /* 3️⃣  ajoute un signer (simple + sms/no_code) ------------------------- */
  private addSigner(reqId: string, first: string, last: string) {
    return this.call<SignerRes>(
      `signature_requests/${reqId}/signers`,
      {
        method: 'POST',
        json  : {
          info: {
            first_name: first,
            last_name : last,
            email     : 'no-reply@example.com',
            locale    : 'fr',
          },
          signature_level  : 'simple',
          authentication_mode: 'no_code',     // ← clé & valeur conformes
        },
      },
    );
  }

  /* 4️⃣  activation ------------------------------------------------------ */
  private activateRequest(reqId: string) {
    return this.call(`signature_requests/${reqId}/activate`, { method: 'POST' });
  }

  /* █ API publique pour DocumentService █ */
  async createProcedure(consent: ConsentDocument, filePath: string) {
    const req = await this.createSignatureRequest(consent);
    await this.uploadDocument(req.id, filePath);

    const secretary = await this.addSigner(req.id, 'Secrétaire', 'IME');
    await this.addSigner(req.id, 'Parent', 'IME');

    await this.activateRequest(req.id);
    return { id: req.id, secretarySignUrl: secretary.embedded_url! };
  }

  async getMemberSignUrl(reqId: string, isSecretary: boolean) {
    const { items } = await this.call<{ items: SignerRes[] }>(
      `signature_requests/${reqId}/signers`,
    );
    const signer = items[isSecretary ? 0 : 1];
    if (!signer?.embedded_url) throw new InternalServerErrorException('URL introuvable');
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

/* ──────────── types réduits (retours API) ──────────── */
interface SignatureRequestRes { id: string }
interface DocumentRes         { id: string }
interface SignerRes           { id: string; embedded_url?: string }

@Injectable()
export class YousignService {
  private readonly log  = new Logger(YousignService.name);

  /* NB : la clé ***doit*** appartenir au même environnement que l’URL */
  private readonly BASE = (process.env.YOUSIGN_API_URL ?? 'https://api-sandbox.yousign.app/v3').trim();
  private readonly KEY  = (process.env.YOUSIGN_API_KEY  ?? '').trim();
  private readonly HOOK = (process.env.YOUSIGN_WEBHOOK_SECRET ?? '').trim();

  /* ---------------- helper HTTP (Bearer API-KEY) ---------------- */
  private async call<T>(
    endpoint: string,
    init: RequestInit & { json?: unknown } = {},
  ): Promise<T> {
    const { json, ...opts } = init;
    const r = await fetch(`${this.BASE}/${endpoint}`, {
      ...opts,
      headers: {
        Authorization : `Bearer ${this.KEY}`,
        Accept        : 'application/json',
        ...(json && { 'Content-Type': 'application/json' }),
        ...init.headers,
      },
      body: json ? JSON.stringify(json) : init.body,
    });

    if (!r.ok) {
      this.log.error(`Yousign ${endpoint} → ${r.status}: ${await r.text()}`);
      throw new InternalServerErrorException('Appel Yousign échoué');
    }
    return r.json() as Promise<T>;
  }

  /* 1️⃣  Signature Request (mode “email / notifications par Yousign”) */
  private createSignatureRequest(consent: ConsentDocument) {
    return this.call<SignatureRequestRes>('signature_requests', {
      method: 'POST',
      json  : {
        name         : consent.name,
        delivery_mode: 'email',      // Yousign envoie les e-mails
        timezone     : 'Europe/Paris',
      },
    });
  }

  /* 2️⃣  Upload du PDF  (multipart + parse_anchors : true) */
  private async uploadDocument(reqId: string, file: string) {
    const fd = new FormData();
    fd.append(
      'file',
      new Blob([await fs.readFile(file)], { type: 'application/pdf' }),
      path.basename(file).replace(/\.?$/, '.pdf'),   // garantit .pdf
    );
    fd.append('nature', 'signable_document');
    fd.append('parse_anchors', 'true');             // ⚓︎ {{#anchor}} dans le PDF

    return this.call<DocumentRes>(
      `signature_requests/${reqId}/documents`,
      { method: 'POST', body: fd as any },          // ↩️  multipart/-form
    );
  }

  /* 3️⃣  Ajout d’un Signer : simple + no_otp *****************************
     ──────────────────────────────────────────────────────────────────── */
  private addSigner(
    reqId: string,
    first: string,
    last : string,
    email: string,
  ) {
    return this.call<SignerRes>(`signature_requests/${reqId}/signers`, {
      method: 'POST',
      json  : {
        info: {
          first_name: first,
          last_name : last,
          email,
          locale    : 'fr',
        },
        signature_level              : 'electronic_signature',
        signature_authentication_mode: 'no_otp',   // ← clé & valeur exactes
      },
    });
  }

  /* 4️⃣  Activation (envoi des e-mails) */
  private activateRequest(reqId: string) {
    return this.call(`signature_requests/${reqId}/activate`, { method: 'POST' });
  }

  /* ██████████  API consommée par DocumentService  ██████████ */
  async createProcedure(consent: ConsentDocument, pdfPath: string) {
    /* 1. brouillon */
    const req = await this.createSignatureRequest(consent);

    /* 2. PDF (smart-anchors dans le gabarit => pas de coords à fournir) */
    await this.uploadDocument(req.id, pdfPath);

    /* 3. signers (secrétaire = utilisateur connecté ; parent = cible)   */
    const secretary = await this.addSigner(
      req.id,
      'Secrétaire', 'IME',
      consent.secretary.email,      // adresse réelle => reçoit le lien
    );
    await this.addSigner(
      req.id,
      'Parent', 'IME',
      consent.parent.email,         // adresse du parent
    );

    /* 4. go ! */
    await this.activateRequest(req.id);

    return { id: req.id, secretarySignUrl: secretary.embedded_url! };
  }

  /* URL « magic-link » d’un membre (items[0]=secrétaire, items[1]=parent) */
  async getMemberSignUrl(reqId: string, forSecretary: boolean) {
    const { items } = await this.call<{ items: SignerRes[] }>(
      `signature_requests/${reqId}/signers`,
    );
    const signer = items[forSecretary ? 0 : 1];
    if (!signer?.embedded_url) {
      throw new InternalServerErrorException('URL de signature introuvable');
    }
    return signer.embedded_url;
  }

  /* Téléchargement du PDF final signé (après webhook “finished”) */
  async downloadFinalFile(reqId: string, dest: string) {
    const { download_url } = await this.call<{ download_url: string }>(
      `signature_requests/${reqId}/documents?nature=signable_document`,
    );
    const r = await fetch(download_url);
    if (!r.ok) throw new InternalServerErrorException('Download PDF échoué');
    await fs.writeFile(dest, Buffer.from(await r.arrayBuffer()));
    this.log.log(`PDF final téléchargé → ${dest}`);
  }

  /* (facultatif) validation HMAC du webhook */
  verifyWebhookSignature(raw: string, sig: string) {
    if (!this.HOOK) return true;
    const hash = crypto.createHmac('sha256', this.HOOK).update(raw).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(sig));
  }
}
