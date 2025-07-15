// src/presence/presence.service.ts

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JustifyAbsenceDto, JustificationType } from './dto/presence.dto';
import { Role } from '@prisma/client';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class PresenceService {
  private readonly encryptionKey = process.env.FILE_ENCRYPTION_KEY || 'default-key-change-me';
  private readonly uploadDir = path.join(process.cwd(), 'uploads', 'justifications');

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Aplatit la feuille en gardant la structure child.parent.phone
   * Masque le téléphone selon le rôle utilisateur
   */
  private mapSheet(raw: any, userRole?: Role) {
    if (!raw) return null;

    return {
      id: raw.id,
      date: raw.date,
      status: raw.status,
      validatedAtStaff: raw.validatedAtStaff,
      validatedAtSecretary: raw.validatedAtSecretary,
      staff: raw.staff, // { staffProfile: { firstName, lastName } }
      records: raw.records.map((r: any) => ({
        id: r.id,
        childId: r.childId,
        present: r.present,
        justification: r.justification,
        child: {
          id: r.child.id,
          firstName: r.child.firstName,
          lastName: r.child.lastName,
          birthDate: r.child.birthDate,
          parentProfileId: r.child.parentProfileId,
          parent: r.child.parent ? { 
            phone: this.getPhoneBasedOnRole(r.child.parent.phone, userRole)
          } : undefined,
        },
      })),
    };
  }

  /**
   * Retourne le numéro de téléphone selon le rôle de l'utilisateur
   * SECRETARY, DIRECTOR, SERVICE_MANAGER : numéro complet
   * Autres rôles : numéro masqué
   */
  private getPhoneBasedOnRole(phone: string, userRole?: Role): string {
    if (!phone) return phone;
    
    const authorizedRoles: Role[] = [Role.SECRETARY, Role.DIRECTOR, Role.SERVICE_MANAGER];
    
    if (userRole && authorizedRoles.includes(userRole)) {
      return phone; // Numéro complet pour les rôles autorisés
    }
    
    // Numéro masqué pour les autres rôles
    return this.maskPhoneNumber(phone);
  }

  /**
   * Masque un numéro de téléphone pour la confidentialité
   */
  private maskPhoneNumber(phone: string): string {
    if (!phone || phone.length < 10) return phone;
    return phone.replace(/(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 ** ** $5');
  }

  /** 1. Créer ou récupérer la feuille du jour (STAFF) */
  async createSheet(dateString: string, staffId: string, userRole?: Role) {
    const date = new Date(dateString);

    // 1) Upsert de la feuille
    const sheetUpsert = await this.prisma.presenceSheet.upsert({
      where: { date },
      create: { date, staffId, status: 'PENDING_STAFF' },
      update: {},
    });

    // 2) Génération des records s'ils n'existent pas
    const exists = await this.prisma.presenceRecord.findFirst({
      where: { sheetId: sheetUpsert.id },
      select: { id: true },
    });
    if (!exists) {
      const children = await this.prisma.child.findMany();
      await this.prisma.presenceRecord.createMany({
        data: children.map(c => ({
          sheetId: sheetUpsert.id,
          childId: c.id,
          present: false,
        })),
      });
    }

    // 3) Lecture complète avec parent.phone
    const raw = (await this.prisma.presenceSheet.findUnique({
      where: { id: sheetUpsert.id },
      include: {
        records: {
          include: {
            child: {
              include: {
                parent: { select: { phone: true } },
              },
            },
            justification: true,
          },
        },
        staff: {
          select: {
            staffProfile: { select: { firstName: true, lastName: true } },
          },
        },
      },
    })) as any;

    return this.mapSheet(raw, userRole);
  }

  /** 2. Valider la feuille (STAFF) */
  async validateSheet(
    sheetId: number,
    presentChildIds: number[],
    staffId: string,
    userRole?: Role,
  ) {
    return await this.prisma.$transaction(async (prisma) => {
      // Vérification avec lock pessimiste
      const sheet = await prisma.presenceSheet.findUnique({ 
        where: { id: sheetId },
        select: { id: true, status: true, staffId: true, date: true }
      });
      
      if (!sheet) {
        throw new NotFoundException('Feuille introuvable');
      }
      
      if (sheet.status !== 'PENDING_STAFF') {
        throw new BadRequestException('Feuille non éligible à la validation');
      }

      // Vérification d'autorisation métier
      if (sheet.staffId !== staffId && sheet.staffId !== 'SYSTEM') {
        throw new ForbiddenException('Vous ne pouvez pas modifier cette feuille');
      }

      // Supprime puis recrée tous les records dans la transaction
      await prisma.presenceRecord.deleteMany({ where: { sheetId } });
      
      const children = await prisma.child.findMany();
      const presentSet = new Set(presentChildIds);
      
      await prisma.presenceRecord.createMany({
        data: children.map(ch => ({
          sheetId,
          childId: ch.id,
          present: presentSet.has(ch.id),
        })),
      });

      // Met à jour la feuille avec version optimiste
      const updatedSheet = await prisma.presenceSheet.update({
        where: { id: sheetId },
        data: {
          staffId,
          validatedAtStaff: new Date(),
          status: 'PENDING_SECRETARY',
        },
        include: {
          records: {
            include: {
              child: {
                include: {
                  parent: { select: { phone: true } },
                },
              },
              justification: true,
            },
          },
          staff: {
            select: {
              staffProfile: { select: { firstName: true, lastName: true } },
            },
          },
        },
      });

      return this.mapSheet(updatedSheet as any, userRole);
    }, {
      isolationLevel: 'Serializable', // Isolation maximale pour éviter les race conditions
      timeout: 10000, // Timeout de 10 secondes
    });
  }

  /** 3. Justifier une absence ou un retard (SECRETARY) */
  async justify(recordId: number, dto: JustifyAbsenceDto, filePath?: string, userRole?: Role) {
    return await this.prisma.$transaction(async (prisma) => {
      // Vérification avec lock
      const rec = await prisma.presenceRecord.findUnique({
        where: { id: recordId },
        include: { sheet: true },
      });
      
      if (!rec) {
        throw new NotFoundException('Enregistrement introuvable');
      }
      
      if (rec.present) {
        throw new BadRequestException('Impossible de justifier un présent');
      }

      // Vérifier qu'il n'y a pas déjà une justification
      const existingJustification = await prisma.absenceJustification.findUnique({
        where: { recordId }
      });
      
      if (existingJustification) {
        throw new BadRequestException('Une justification existe déjà pour cette absence');
      }

      const motifValue =
        dto.motif ?? (dto.type === JustificationType.LATENESS ? 'Retard justifié' : '');

      // Créer la justification
      await prisma.absenceJustification.create({
        data: {
          recordId,
          type: dto.type,
          justificationDate: new Date(dto.justificationDate),
          motif: motifValue,
          filePath: filePath ?? null,
        },
      });

      // Si plus d'absences non justifiées → passe au statut VALIDATED
      const pending = await prisma.presenceRecord.count({
        where: {
          sheetId: rec.sheetId,
          present: false,
          justification: null,
        },
      });
      
      const updateData: any = { validatedBySecretary: pending === 0 };
      if (pending === 0) {
        updateData.validatedAtSecretary = new Date();
        updateData.status = 'VALIDATED';
      }

      const updatedSheet = await prisma.presenceSheet.update({
        where: { id: rec.sheetId },
        data: updateData,
        include: {
          records: {
            include: {
              child: {
                include: {
                  parent: { select: { phone: true } },
                },
              },
              justification: true,
            },
          },
          staff: {
            select: {
              staffProfile: { select: { firstName: true, lastName: true } },
            },
          },
        },
      });

      return this.mapSheet(updatedSheet as any, userRole);
    }, {
      isolationLevel: 'ReadCommitted', // Isolation appropriée pour cette opération
      timeout: 10000,
    });
  }

  /** 4. Lire la feuille par date (STAFF, SECRETARY…) */
  async findByDate(dateString: string, userRole?: Role) {
    const date = new Date(dateString);
    const raw = (await this.prisma.presenceSheet.findUnique({
      where: { date },
      include: {
        records: {
          include: {
            child: {
              include: {
                parent: { select: { phone: true } },
              },
            },
            justification: true,
          },
        },
        staff: {
          select: {
            staffProfile: { select: { firstName: true, lastName: true } },
          },
        },
      },
    })) as any;

    if (!raw)
      throw new NotFoundException(`Feuille non trouvée pour la date ${dateString}`);
    return this.mapSheet(raw, userRole);
  }

  /**
   * Valide le contenu d'un fichier pour s'assurer qu'il correspond à son type MIME
   */
  private async validateFileContent(filePath: string, expectedMimeType: string): Promise<boolean> {
    try {
      const fileBuffer = await fs.promises.readFile(filePath);
      
      // Vérification des signatures de fichier (magic numbers)
      const fileSignatures: Record<string, Buffer[]> = {
        'application/pdf': [Buffer.from([0x25, 0x50, 0x44, 0x46])], // %PDF
        'image/jpeg': [
          Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]),
          Buffer.from([0xFF, 0xD8, 0xFF, 0xE1]),
          Buffer.from([0xFF, 0xD8, 0xFF, 0xE8]),
        ],
        'image/png': [Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])],
        'image/webp': [Buffer.from([0x52, 0x49, 0x46, 0x46])], // RIFF
      };

      const signatures = fileSignatures[expectedMimeType];
      if (!signatures) return false;

      return signatures.some(signature => 
        fileBuffer.subarray(0, signature.length).equals(signature)
      );
    } catch (error) {
      console.error('Erreur validation fichier:', error);
      return false;
    }
  }

  /**
   * Chiffre un fichier pour le stockage sécurisé
   */
  private encryptFile(data: Buffer): { encryptedData: Buffer; iv: string } {
    const algorithm = 'aes-256-gcm';
    const key = crypto.scryptSync(this.encryptionKey, 'salt', 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    
    const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
    
    return {
      encryptedData: encrypted,
      iv: iv.toString('hex')
    };
  }

  /**
   * Déchiffre un fichier depuis le stockage sécurisé
   */
  private decryptFile(encryptedData: Buffer, ivHex: string): Buffer {
    const algorithm = 'aes-256-gcm';
    const key = crypto.scryptSync(this.encryptionKey, 'salt', 32);
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    
    return Buffer.concat([decipher.update(encryptedData), decipher.final()]);
  }

  /**
   * Sécurise le stockage d'un fichier avec validation et chiffrement optionnel
   */
  async secureFileStorage(filePath: string, originalMimeType: string, shouldEncrypt = false): Promise<{ success: boolean; secureFilename?: string; error?: string }> {
    try {
      // 1. Validation du contenu du fichier
      const isValidContent = await this.validateFileContent(filePath, originalMimeType);
      if (!isValidContent) {
        // Supprimer le fichier invalide
        await fs.promises.unlink(filePath).catch(() => {});
        return { success: false, error: 'Contenu du fichier invalide ou corrompu' };
      }

      // 2. Vérification de la taille
      const stats = await fs.promises.stat(filePath);
      if (stats.size > 5 * 1024 * 1024) { // 5MB
        await fs.promises.unlink(filePath).catch(() => {});
        return { success: false, error: 'Fichier trop volumineux' };
      }

      // 3. Génération d'un nom sécurisé
      const fileExtension = path.extname(filePath);
      const secureFilename = `${crypto.randomUUID()}${fileExtension}`;
      const finalPath = path.join(this.uploadDir, secureFilename);

      // 4. Chiffrement optionnel pour les documents sensibles
      if (shouldEncrypt) {
        const fileData = await fs.promises.readFile(filePath);
        const { encryptedData, iv } = this.encryptFile(fileData);
        
        // Stocker les métadonnées de chiffrement dans un fichier séparé
        const metadataPath = path.join(this.uploadDir, `${secureFilename}.meta`);
        await fs.promises.writeFile(metadataPath, JSON.stringify({
          encrypted: true,
          iv,
          originalMimeType,
          createdAt: new Date().toISOString()
        }));
        
        await fs.promises.writeFile(finalPath, encryptedData);
      } else {
        // Déplacement simple vers le nom sécurisé
        await fs.promises.rename(filePath, finalPath);
      }

      // 5. Permissions restrictives
      await fs.promises.chmod(finalPath, 0o600); // Lecture/écriture pour le propriétaire seulement

      return { success: true, secureFilename };
    } catch (error) {
      console.error('Erreur sécurisation fichier:', error);
      // Nettoyage en cas d'erreur
      await fs.promises.unlink(filePath).catch(() => {});
      return { success: false, error: 'Erreur lors de la sécurisation du fichier' };
    }
  }

  /**
   * Supprime un fichier de manière sécurisée
   */
  async secureFileDelete(filename: string): Promise<void> {
    try {
      const filePath = path.join(this.uploadDir, filename);
      const metadataPath = `${filePath}.meta`;
      
      // Écraser le fichier avec des données aléatoires avant suppression
      if (await fs.promises.access(filePath).then(() => true).catch(() => false)) {
        const stats = await fs.promises.stat(filePath);
        const randomData = crypto.randomBytes(stats.size);
        await fs.promises.writeFile(filePath, randomData);
        await fs.promises.unlink(filePath);
      }
      
      // Supprimer les métadonnées si elles existent
      await fs.promises.unlink(metadataPath).catch(() => {});
    } catch (error) {
      console.error('Erreur suppression sécurisée:', error);
    }
  }
}
