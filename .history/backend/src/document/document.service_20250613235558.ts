import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateConsentDto } from './dto/create-consent.dto';
import { ConsentStatus } from '@prisma/client';
import { YousignService } from './yousign/yousign.service';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

@Injectable()
export class DocumentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly yousign: YousignService,
  ) {}

  /** 1️⃣ Création + upload + init procédure Yousign */
  async createConsent(
    dto: CreateConsentDto,
    file: Express.Multer.File,
    secretaryId: string,
  ) {
    // 1. Stockage temporaire OK (Multer l’a déjà mis dans uploads/tmp)
    // 2. Enregistrer en DB
    const consent = await this.prisma.consentDocument.create({
      data: {
        name: dto.name,
        originalPath: file.path,
        parentId: dto.parentId,
        secretaryId,
      },
    });

    // 3. Init Yousign
    const proc = await this.yousign.createProcedure(consent, file.path);
    // 4. MAJ DB avec id procédure
    await this.prisma.consentDocument.update({
      where: { id: consent.id },
      data: { yousignProcId: proc.id },
    });

    return { consentId: consent.id, signUrl: proc.secretarySignUrl };
  }

  /** 2️⃣ URL de signature dynamique pour l’utilisateur courant */
  async getSignUrl(consentId: string, userId: string) {
    const consent = await this.prisma.consentDocument.findUnique({ where: { id: consentId } });
    if (!consent) throw new NotFoundException('Consentement introuvable');

    const isSecretary = userId === consent.secretaryId;
    const isParent = userId === consent.parentId;
    if (!isSecretary && !isParent) throw new ForbiddenException();

    return this.yousign.getMemberSignUrl(consent.yousignProcId, isSecretary);
  }

  /** 3️⃣ Webhook Yousign → mise à jour statut */
  async handleWebhook(eventName: string, payload: any) {
    const { procedure } = payload;
    const consent = await this.prisma.consentDocument.findFirst({
      where: { yousignProcId: procedure.id },
    });
    if (!consent) return;

    if (eventName === 'procedure.member.finished') {
      // passage SECRETARY_PENDING -> PARENT_PENDING
      if (consent.status === ConsentStatus.SECRETARY_PENDING) {
        await this.prisma.consentDocument.update({
          where: { id: consent.id },
          data: { status: ConsentStatus.PARENT_PENDING },
        });
      }
    }

    if (eventName === 'procedure.finished') {
      // Télécharger le PDF final
      const destDir = process.env.UPLOAD_DOC_DIR || 'uploads/document';
      await fs.mkdir(destDir, { recursive: true });

      const pdfPath = path.join(destDir, `${consent.id}-signed.pdf`);
      await this.yousign.downloadFinalFile(procedure.id, pdfPath);

      await this.prisma.consentDocument.update({
        where: { id: consent.id },
        data: {
          status: ConsentStatus.COMPLETED,
          signedPath: pdfPath,
        },
      });
    }
  }

  /** 4️⃣ Listes filtrées */
  listForSecretary(secretaryId: string, query) {
    return this.prisma.consentDocument.findMany({
      where: { secretaryId, ...query },
      orderBy: { createdAt: 'desc' },
    });
  }

  listForParent(parentId: string, query) {
    return this.prisma.consentDocument.findMany({
      where: { parentId, ...query },
      orderBy: { createdAt: 'desc' },
    });
  }
}
