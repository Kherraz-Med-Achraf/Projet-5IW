/* ───────── src/document/yousign/yousign.service.ts ───────── */
import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConsentDocument } from '@prisma/client';
import { FormData }   from 'undici';
import * as fs        from 'node:fs/promises';
import * as path      from 'node:path';
import * as crypto    from 'node:crypto';

/* ───── types minimale de réponse ───── */
interface SignatureRequestRes { id: string }
interface DocumentRes         { id: string }
interface SignerRes           { id: string; embedded_url?: string }

@Injectable()
export class YousignService {
  private readonly log = new Logger(YousignService.name);

  /* endpoints & secrets ------------------------------------------------- */
  private readonly BASE = (process.env.YOUSIGN_API_URL ??
    'https://api-sandbox.yousign.app/v3').trim();
  private readonly KEY  = (process.env.YOUSIGN_API_KEY  ?? '').trim();
  private readonly HOOK = (process.env.YOUSIGN_WEBHOOK_SECRET ?? '').trim();

  /* ╭──── helper générique : trace TOUTES les requêtes ────╮ */
  private async call<T>(
    endpoint: string,
    init: RequestInit & { json?: unknown } = {},
  ): Promise<T> {
    const { json, ...opts } = init;

    /* log entrée */
    this.log.debug(
      `→ Yousign ${opts.method ?? 'GET'} ${endpoint}` +
      (json ? `\n${JSON.stringify(json, null, 2)}` : ''),
    );

    const res = await fetch(`${this.BASE}/${endpoint}`, {
      ...opts,
      headers: {
        Authorization: `Bearer ${this.KEY}`,
        Accept: 'application/json',
        ...(json ? { 'Content-Type': 'application/json' } : {}),
      },
      body: json ? JSON.stringify(json) : opts.body,
    });

    /* log sortie */
    this.log.verbose(`← ${res.status} ${endpoint}`);

    if (!res.ok) {
      const txt = await res.text();
      this.log.error(`Yousign ${endpoint} KO → ${res.status}\n${txt}`);
      throw new InternalServerErrorException('Appel Yousign échoué');
    }
    return res.json() as Promise<T>;
  }
  /* ╰──────────────────────────────────────────────────────╯ */

  /* 1️⃣  Création de la Signature-request ------------------------------- */
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

  /* 2️⃣  Upload du PDF -------------------------------------------------- */
  private async uploadDocument(reqId: string, filePath: string) {
    const blob = new Blob(
      [await fs.readFile(filePath)],
      { type: 'application/pdf' },
    );
    const filename = path.basename(filePath).replace(/(\.pdf)?$/i, '.pdf');

    const fd = new FormData();
    fd.append('file', blob, filename);
    fd.append('nature', 'signable_document');

    return this.call<DocumentRes>(
      `signature_requests/${reqId}/documents`,
      { method: 'POST', body: fd as any },
    );
  }

  /* 3️⃣  Ajout d’un signer (mode “no_otp” + champ signature) ------------ */
  private addSigner(
    reqId: string,
    documentId: string,
    info: { first: string; last: string; email: string; y: number },
  ) {
    return this.call<SignerRes>(
      `signature_requests/${reqId}/signers`,
      {
        method: 'POST',
        json: {
          info: {
            first_name: info.first,
            last_name : info.last,
            email     : info.email,
            locale    : 'fr',
          },
          signature_level              : 'electronic_signature',
          signature_authentication_mode: 'no_otp',
          fields: [
            {
              type       : 'signature',
              document_id: documentId,
              page       : 1,
              x          : 150,
              y          : info.y,
            },
          ],
        },
      },
    );
  }

  /* 4️⃣  Activation ----------------------------------------------------- */
  private activateRequest(reqId: string) {
    return this.call(`signature_requests/${reqId}/activate`, { method: 'POST' });
  }

  /* █  API utilisée par le DocumentService █ --------------------------- */
  async createProcedure(
    consent       : ConsentDocument,
    filePath      : string,
    secretaryEmail: string,
    parentEmail   : string,
  ) {
    /* 1. brouillon SR */
    const sr  = await this.createSignatureRequest(consent);

    /* 2. upload doc */
    const doc = await this.uploadDocument(sr.id, filePath);

    /* 3. signataires (ordre) */
    const secretary = await this.addSigner(
      sr.id, doc.id,
      { first: 'Secrétaire', last: 'IME', email: secretaryEmail, y: 500 },
    );
    await this.addSigner(
      sr.id, doc.id,
      { first: 'Parent', last: 'IME', email: parentEmail, y: 420 },
    );

    /* 4. activation */
    await this.activateRequest(sr.id);

    return { id: sr.id, secretarySignUrl: secretary.embedded_url! };
  }

  /* Url embarquée (0 = secrétaire) ------------------------------------- */
  async getMemberSignUrl(reqId: string, isSecretary: boolean) {
    const { items } = await this.call<{ items: SignerRes[] }>(
      `signature_requests/${reqId}/signers`,
    );
    const signer = items[isSecretary ? 0 : 1];
    if (!signer?.embedded_url) {
      throw new InternalServerErrorException('URL de signature introuvable');
    }
    return signer.embedded_url;
  }

  /* PDF final ----------------------------------------------------------- */
  async downloadFinalFile(reqId: string, dest: string) {
    const { download_url } = await this.call<{ download_url: string }>(
      `signature_requests/${reqId}/documents?nature=signable_document`,
    );
    const r = await fetch(download_url);
    if (!r.ok) throw new InternalServerErrorException('Download PDF échoué');
    await fs.writeFile(dest, Buffer.from(await r.arrayBuffer()));
  }

  /* Vérification HMAC webhook ------------------------------------------ */
  verifyWebhookSignature(raw: string, sig: string) {
    if (!this.HOOK) return true;
    const calc = crypto
      .createHmac('sha256', this.HOOK)
      .update(raw, 'utf8')
      .digest('hex');
    return crypto.timingSafeEqual(Buffer.from(calc), Buffer.from(sig));
  }
}
