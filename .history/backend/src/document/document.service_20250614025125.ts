/* src/document/document.service.ts */
import {
    Injectable,
    NotFoundException,
    ForbiddenException,
    InternalServerErrorException,
  } from '@nestjs/common';
  import { Prisma, ConsentStatus } from '@prisma/client';
  import { PrismaService }  from '../prisma/prisma.service';
  import { CreateConsentDto } from './dto/create-consent.dto';
  import { YousignService }   from './yousign/yousign.service';
  import * as fs   from 'node:fs/promises';
  import * as path from 'node:path';
  
  interface PersonInfo {
    email: string;
    firstName: string;
    lastName: string;
  }
  
  @Injectable()
  export class DocumentService {
    constructor(
      private readonly prisma: PrismaService,
      private readonly yousign: YousignService,
    ) {}
  
    /* ------------------------------------------------------------------ *
     * 1️⃣  Création consentement + procédure Yousign
     * ------------------------------------------------------------------ */
    async createConsent(
      dto: CreateConsentDto,
      file: Express.Multer.File,
      secretaryId: string,
    ) {
      /* ── ①  Résoudre le parent (profil → user) ─────────────────────── */
      let parentUserId = dto.parentId;
  
      if (/^\d+$/.test(parentUserId)) {
        const profile = await this.prisma.parentProfile.findUnique({
          where: { id: Number(parentUserId) },
          select: { userId: true },
        });
        if (!profile) throw new NotFoundException('Parent introuvable');
        parentUserId = profile.userId;
      }
  
      /* ── ②  Récupérer les infos secrétaire & parent ─────────────────── */
      const [secUser, parUser] = await Promise.all([
        this.prisma.user.findUnique({
          where: { id: secretaryId },
          select: {
            email: true,
            secretaryProfile: { select: { firstName: true, lastName: true } },
          },
        }),
        this.prisma.user.findUnique({
          where: { id: parentUserId },
          select: {
            email: true,
            parentProfile: { select: { firstName: true, lastName: true } },
          },
        }),
      ]);
  
      if (!secUser?.secretaryProfile)
        throw new NotFoundException('Profil secrétaire manquant');
      if (!parUser?.parentProfile)
        throw new NotFoundException('Profil parent manquant');
  
      const secretaryInfo: PersonInfo = {
        email: secUser.email,
        firstName: secUser.secretaryProfile.firstName,
        lastName:  secUser.secretaryProfile.lastName,
      };
  
      const parentInfo: PersonInfo = {
        email: parUser.email,
        firstName: parUser.parentProfile.firstName,
        lastName:  parUser.parentProfile.lastName,
      };
  
      /* ── ③  Enregistrer le consentement localement ──────────────────── */
      const consent = await this.prisma.consentDocument.create({
        data: {
          name        : dto.name,
          originalPath: file.path,
          parentId    : parentUserId,
          secretaryId ,
        },
      });
  
      /* ── ④  Créer la procédure Yousign ──────────────────────────────── */
      const proc = await this.yousign.createProcedure(
        consent,
        file.path,
        secretaryInfo,
        parentInfo,
      );
  
      await this.prisma.consentDocument.update({
        where: { id: consent.id },
        data : { yousignProcId: proc.id },
      });
  
      return { consentId: consent.id, signUrl: proc.secretarySignUrl };
    }
  
    /* ------------------------------------------------------------------ *
     * 2️⃣  URL de signature (secrétaire / parent)
     * ------------------------------------------------------------------ */
    async getSignUrl(consentId: string, userId: string) {
      const consent = await this.prisma.consentDocument.findUnique({
        where: { id: consentId },
      });
      if (!consent) throw new NotFoundException('Consentement introuvable');
  
      const isSecretary = userId === consent.secretaryId;
      const isParent    = userId === consent.parentId;
      if (!isSecretary && !isParent) throw new ForbiddenException();
  
      if (!consent.yousignProcId) {
        throw new InternalServerErrorException(
          'Procédure Yousign non initialisée',
        );
      }
  
      return this.yousign.getMemberSignUrl(
        consent.yousignProcId,
        isSecretary,
      );
    }
  
    /* ------------------------------------------------------------------ *
     * 3️⃣  Webhook Yousign → mise à jour statut
     * ------------------------------------------------------------------ */
    async handleWebhook(eventName: string, payload: any) {
      const { procedure } = payload;
      const consent = await this.prisma.consentDocument.findFirst({
        where: { yousignProcId: procedure.id },
      });
      if (!consent) return;
  
      if (
        eventName === 'procedure.member.finished' &&
        consent.status === ConsentStatus.SECRETARY_PENDING
      ) {
        await this.prisma.consentDocument.update({
          where: { id: consent.id },
          data : { status: ConsentStatus.PARENT_PENDING },
        });
      }
  
      if (eventName === 'procedure.finished') {
        const destDir = process.env.UPLOAD_DOC_DIR || 'uploads/document';
        await fs.mkdir(destDir, { recursive: true });
  
        const pdfPath = path.join(destDir, `${consent.id}-signed.pdf`);
        await this.yousign.downloadFinalFile(procedure.id, pdfPath);
  
        await this.prisma.consentDocument.update({
          where: { id: consent.id },
          data : {
            status    : ConsentStatus.COMPLETED,
            signedPath: pdfPath,
          },
        });
      }
    }
  
    /* ------------------------------------------------------------------ *
     * 4️⃣  Listes filtrées (secrétaire / parent)
     * ------------------------------------------------------------------ */
    listForSecretary(
      secretaryId: string,
      query: { status?: ConsentStatus; page?: number; limit?: number } = {},
    ) {
      const { status, page = 1, limit = 20 } = query;
      const where: Prisma.ConsentDocumentWhereInput = { secretaryId };
      if (status) where.status = status;
  
      return this.prisma.consentDocument.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      });
    }
  
    listForParent(
      parentId: string,
      query: { status?: ConsentStatus; page?: number; limit?: number } = {},
    ) {
      const { status, page = 1, limit = 20 } = query;
      const where: Prisma.ConsentDocumentWhereInput = { parentId };
      if (status) where.status = status;
  
      return this.prisma.consentDocument.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      });
    }
  }
  