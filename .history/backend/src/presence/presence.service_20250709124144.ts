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
import { readSecret } from '../utils/secret';

@Injectable()
export class PresenceService {
  private readonly uploadDir = path.join(
    process.cwd(),
    'uploads',
    'justifications',
  );

  constructor(private readonly prisma: PrismaService) {
    // Validation de la clé de chiffrement au démarrage
    this.validateEncryptionKey();
  }

  /**
   * Getter pour la clé de chiffrement (maintenant dynamique)
   */
  private get encryptionKey(): string {
    if (!process.env.FILE_ENCRYPTION_KEY) {
      try {
        process.env.FILE_ENCRYPTION_KEY = readSecret(
          '/run/secrets/file_encryption_key',
          'FILE_ENCRYPTION_KEY',
        );
      } catch (_) {
        // On laisse la validation gérer l'erreur si aucune clé n'est dispo
      }
    }
    const key = process.env.FILE_ENCRYPTION_KEY;
    if (!key) {
      throw new Error('Clé de chiffrement non disponible');
    }
    return key;
  }

  /**
   * Valide que la clé de chiffrement est suffisamment sécurisée
   */
  private validateEncryptionKey(): void {
    const nodeEnv = process.env.NODE_ENV || 'development';
    const isProduction = nodeEnv === 'production';

    // Charger via Docker secret si non défini
    if (!process.env.FILE_ENCRYPTION_KEY) {
      try {
        process.env.FILE_ENCRYPTION_KEY = readSecret(
          '/run/secrets/file_encryption_key',
          'FILE_ENCRYPTION_KEY',
        );
      } catch (_) {
        // ignoré – validations ci-dessous s'en chargeront
      }
    }

    const encryptionKey = process.env.FILE_ENCRYPTION_KEY;

    // En production : validation stricte obligatoire
    if (isProduction) {
      if (!encryptionKey) {
        throw new Error(
          '❌ PRODUCTION: FILE_ENCRYPTION_KEY manquante. Application arrêtée pour sécurité.',
        );
      }

      if (encryptionKey === 'default-key-change-me') {
        throw new Error(
          '❌ PRODUCTION: Clé de chiffrement par défaut détectée. Changez FILE_ENCRYPTION_KEY.',
        );
      }

      if (encryptionKey.length < 32) {
        throw new Error(
          '❌ PRODUCTION: FILE_ENCRYPTION_KEY trop courte (minimum 32 caractères).',
        );
      }

      this.logSecure(
        'info',
        'Clé de chiffrement validée pour la production',
        {},
      );
      return;
    }

    // En développement : validation plus souple avec avertissements
    if (!encryptionKey) {
      this.logSecure(
        'warn',
        '⚠️ DÉVELOPPEMENT: FILE_ENCRYPTION_KEY manquante. Utilisation clé temporaire.',
        {
          recommendation:
            'Ajoutez FILE_ENCRYPTION_KEY=your-32-character-key-here à votre .env',
        },
      );

      // Générer une clé temporaire pour le développement
      const crypto = require('crypto');
      const tempKey = crypto.randomBytes(32).toString('hex');
      process.env.FILE_ENCRYPTION_KEY = tempKey;

      this.logSecure(
        'info',
        'Clé de chiffrement temporaire générée pour le développement',
        {
          keyLength: tempKey.length,
        },
      );
      return;
    }

    if (encryptionKey === 'default-key-change-me') {
      this.logSecure(
        'warn',
        '⚠️ DÉVELOPPEMENT: Clé par défaut détectée. Recommandé de la changer.',
        {},
      );
    }

    if (encryptionKey.length < 32) {
      this.logSecure(
        'warn',
        '⚠️ DÉVELOPPEMENT: Clé trop courte. Recommandé minimum 32 caractères.',
        {
          currentLength: encryptionKey.length,
        },
      );
    }

    this.logSecure(
      'info',
      'Validation clé de chiffrement terminée en mode développement',
      {
        environment: nodeEnv,
        hasKey: !!encryptionKey,
        keyLength: encryptionKey?.length,
      },
    );
  }

  /**
   * Service de logging sécurisé qui masque les données sensibles
   */
  private logSecure(
    level: 'info' | 'warn' | 'error',
    message: string,
    metadata?: any,
  ) {
    const sanitizedMetadata = this.sanitizeLogData(metadata);

    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      service: 'PresenceService',
      ...sanitizedMetadata,
    };

    switch (level) {
      case 'info':
        console.log(JSON.stringify(logEntry));
        break;
      case 'warn':
        console.warn(JSON.stringify(logEntry));
        break;
      case 'error':
        console.error(JSON.stringify(logEntry));
        break;
    }
  }

  /**
   * Nettoie les données sensibles des logs
   */
  private sanitizeLogData(data: any): any {
    if (!data || typeof data !== 'object') return data;

    const sanitized = { ...data };

    // Masquer les numéros de téléphone
    if (sanitized.phone) {
      sanitized.phone = this.maskPhoneNumber(sanitized.phone);
    }

    // Masquer les IDs d'enfants (garder seulement les 2 derniers chiffres)
    if (sanitized.childId) {
      sanitized.childId = `***${sanitized.childId.toString().slice(-2)}`;
    }

    // Masquer les chemins de fichiers (garder seulement le nom)
    if (sanitized.filePath) {
      const filename = path.basename(sanitized.filePath);
      sanitized.filePath = `***/${filename}`;
    }

    // Masquer les emails partiellement
    if (sanitized.email) {
      sanitized.email = sanitized.email.replace(/(.{2}).*@/, '$1***@');
    }

    // Récursion pour les objets imbriqués
    Object.keys(sanitized).forEach((key) => {
      if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
        sanitized[key] = this.sanitizeLogData(sanitized[key]);
      }
    });

    return sanitized;
  }

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
          parent: r.child.parent
            ? {
                phone: this.getPhoneBasedOnRole(r.child.parent.phone, userRole),
              }
            : undefined,
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

    const authorizedRoles: Role[] = [
      Role.SECRETARY,
      Role.DIRECTOR,
      Role.SERVICE_MANAGER,
    ];

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
    return phone.replace(
      /(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/,
      '$1 $2 ** ** $5',
    );
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
        data: children.map((c) => ({
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
    return await this.prisma.$transaction(
      async (prisma) => {
        // Vérification avec lock pessimiste
        const sheet = await prisma.presenceSheet.findUnique({
          where: { id: sheetId },
          select: { id: true, status: true, staffId: true, date: true },
        });

        if (!sheet) {
          throw new NotFoundException('Feuille introuvable');
        }

        if (sheet.status !== 'PENDING_STAFF') {
          throw new BadRequestException('Feuille non éligible à la validation');
        }

        // Vérification d'autorisation métier
        if (sheet.staffId !== staffId && sheet.staffId !== 'SYSTEM' && sheet.staffId !== null) {
          throw new ForbiddenException(
            'Vous ne pouvez pas modifier cette feuille',
          );
        }

        // Supprime puis recrée tous les records dans la transaction
        await prisma.presenceRecord.deleteMany({ where: { sheetId } });

        const children = await prisma.child.findMany();
        const presentSet = new Set(presentChildIds);

        await prisma.presenceRecord.createMany({
          data: children.map((ch) => ({
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
      },
      {
        isolationLevel: 'Serializable', // Isolation maximale pour éviter les race conditions
        timeout: 10000, // Timeout de 10 secondes
      },
    );
  }

  /** 3. Justifier une absence ou un retard (SECRETARY) */
  async justify(
    recordId: number,
    dto: JustifyAbsenceDto,
    filePath?: string,
    userRole?: Role,
  ) {
    return await this.prisma.$transaction(
      async (prisma) => {
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
        const existingJustification =
          await prisma.absenceJustification.findUnique({
            where: { recordId },
          });

        if (existingJustification) {
          throw new BadRequestException(
            'Une justification existe déjà pour cette absence',
          );
        }

        const motifValue =
          dto.motif ??
          (dto.type === JustificationType.LATENESS ? 'Retard justifié' : '');

        let secureFilePath: string | null = null;

        // Traitement sécurisé du fichier si présent
        if (filePath) {
          try {
            // Déterminer le type MIME à partir de l'extension
            const fileExtension = path.extname(filePath).toLowerCase();
            const mimeTypeMap: Record<string, string> = {
              '.pdf': 'application/pdf',
              '.jpg': 'image/jpeg',
              '.jpeg': 'image/jpeg',
              '.png': 'image/png',
              '.webp': 'image/webp',
            };

            const expectedMimeType = mimeTypeMap[fileExtension];
            if (!expectedMimeType) {
              throw new BadRequestException('Type de fichier non supporté');
            }

            // Sécuriser le stockage (chiffrement pour les documents médicaux)
            const shouldEncrypt =
              dto.motif?.toLowerCase().includes('médical') ||
              dto.motif?.toLowerCase().includes('certificat');

            const result = await this.secureFileStorage(
              filePath,
              expectedMimeType,
              shouldEncrypt,
            );

            if (!result.success) {
              throw new BadRequestException(
                result.error || 'Erreur lors du traitement du fichier',
              );
            }

            secureFilePath = result.secureFilename || null;

            this.logSecure('info', 'Fichier de justification traité', {
              recordId,
              type: dto.type,
              encrypted: shouldEncrypt,
              hasFile: !!secureFilePath,
            });
          } catch (error) {
            // Nettoyer le fichier temporaire en cas d'erreur
            await fs.promises.unlink(filePath).catch(() => {});
            throw error;
          }
        }

        // Créer la justification
        await prisma.absenceJustification.create({
          data: {
            recordId,
            type: dto.type,
            justificationDate: new Date(dto.justificationDate),
            motif: motifValue,
            filePath: secureFilePath,
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

        this.logSecure('info', 'Justification créée avec succès', {
          recordId,
          sheetId: rec.sheetId,
          type: dto.type,
          hasFile: !!secureFilePath,
        });

        return this.mapSheet(updatedSheet as any, userRole);
      },
      {
        isolationLevel: 'ReadCommitted', // Isolation appropriée pour cette opération
        timeout: 10000,
      },
    );
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
      throw new NotFoundException(
        `Feuille non trouvée pour la date ${dateString}`,
      );
    return this.mapSheet(raw, userRole);
  }

  /** 5. Méthode pour déclencher manuellement le cron (test uniquement) */
  async runPresenceCronManually() {
    this.logSecure('info', 'Exécution manuelle du cron de présence demandée');
    
    try {
      // Importer dynamiquement le service cron
      const { PresenceCron } = await import('./presence.cron');
      const presenceCron = new PresenceCron(this.prisma);
      
      // Exécuter le cron manuellement
      await presenceCron.handleCron();
      
      this.logSecure('info', 'Cron de présence exécuté avec succès manuellement');
      
      return {
        success: true,
        message: 'Feuilles de présence créées/vérifiées avec succès',
      };
    } catch (error: any) {
      this.logSecure('error', 'Erreur lors de l\'exécution manuelle du cron', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Valide le contenu d'un fichier pour s'assurer qu'il correspond à son type MIME
   */
  private async validateFileContent(
    filePath: string,
    expectedMimeType: string,
  ): Promise<boolean> {
    try {
      const fileBuffer = await fs.promises.readFile(filePath);

      // Vérification de taille minimum
      if (fileBuffer.length < 12) {
        this.logSecure('warn', 'Fichier trop petit pour être valide', {
          expectedMimeType,
        });
        return false;
      }

      // Validation étendue selon le type MIME
      switch (expectedMimeType) {
        case 'application/pdf':
          return this.validatePdfStructure(fileBuffer);
        case 'image/jpeg':
          return this.validateJpegStructure(fileBuffer);
        case 'image/png':
          return this.validatePngStructure(fileBuffer);
        case 'image/webp':
          return this.validateWebpStructure(fileBuffer);
        default:
          this.logSecure('warn', 'Type MIME non supporté pour validation', {
            expectedMimeType,
          });
          return false;
      }
    } catch (error) {
      this.logSecure('error', 'Erreur validation fichier', {
        error: error.message,
        expectedMimeType,
      });
      return false;
    }
  }

  /**
   * Validation spécifique PDF
   */
  private validatePdfStructure(buffer: Buffer): boolean {
    const pdfSignature = Buffer.from([0x25, 0x50, 0x44, 0x46]); // %PDF
    if (!buffer.subarray(0, 4).equals(pdfSignature)) return false;

    // Vérifier version PDF valide
    const versionMatch = buffer
      .subarray(0, 8)
      .toString()
      .match(/%PDF-(\d\.\d)/);
    if (!versionMatch) return false;

    const version = parseFloat(versionMatch[1]);
    return version >= 1.0 && version <= 2.0;
  }

  /**
   * Validation spécifique JPEG
   */
  private validateJpegStructure(buffer: Buffer): boolean {
    // Signature JPEG (FF D8)
    if (buffer[0] !== 0xff || buffer[1] !== 0xd8) return false;

    // Vérifier marqueur de fin JPEG (FF D9)
    const lastTwoBytes = buffer.subarray(-2);
    return lastTwoBytes[0] === 0xff && lastTwoBytes[1] === 0xd9;
  }

  /**
   * Validation spécifique PNG
   */
  private validatePngStructure(buffer: Buffer): boolean {
    const pngSignature = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    ]);
    if (!buffer.subarray(0, 8).equals(pngSignature)) return false;

    // Vérifier chunk IHDR
    const ihdrChunk = buffer.subarray(8, 16);
    return ihdrChunk.toString().includes('IHDR');
  }

  /**
   * Validation spécifique WebP
   */
  private validateWebpStructure(buffer: Buffer): boolean {
    // Signature RIFF
    const riffSignature = Buffer.from([0x52, 0x49, 0x46, 0x46]); // RIFF
    if (!buffer.subarray(0, 4).equals(riffSignature)) return false;

    // Vérifier signature WebP
    const webpSignature = Buffer.from([0x57, 0x45, 0x42, 0x50]); // WEBP
    return buffer.subarray(8, 12).equals(webpSignature);
  }

  /**
   * Chiffre un fichier pour le stockage sécurisé avec authentification
   */
  private encryptFile(data: Buffer): {
    encryptedData: Buffer;
    iv: string;
    authTag: string;
  } {
    const algorithm = 'aes-256-gcm';
    const key = crypto.scryptSync(this.encryptionKey, 'salt', 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, key, iv);

    const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
    const authTag = cipher.getAuthTag(); // Tag d'authentification GCM

    return {
      encryptedData: encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
    };
  }

  /**
   * Déchiffre un fichier depuis le stockage sécurisé avec vérification d'authenticité
   */
  private decryptFile(
    encryptedData: Buffer,
    ivHex: string,
    authTagHex: string,
  ): Buffer {
    const algorithm = 'aes-256-gcm';
    const key = crypto.scryptSync(this.encryptionKey, 'salt', 32);
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    decipher.setAuthTag(authTag); // Vérification du tag d'authentification

    try {
      return Buffer.concat([decipher.update(encryptedData), decipher.final()]);
    } catch (error) {
      this.logSecure(
        'error',
        'Échec déchiffrement - fichier corrompu ou falsifié',
        { error: error.message },
      );
      throw new BadRequestException('Fichier corrompu ou falsifié');
    }
  }

  /**
   * Sécurise le stockage d'un fichier avec validation et chiffrement optionnel
   */
  async secureFileStorage(
    filePath: string,
    originalMimeType: string,
    shouldEncrypt = false,
  ): Promise<{ success: boolean; secureFilename?: string; error?: string }> {
    try {
      // 1. Validation du contenu du fichier
      const isValidContent = await this.validateFileContent(
        filePath,
        originalMimeType,
      );
      if (!isValidContent) {
        // Supprimer le fichier invalide
        await fs.promises.unlink(filePath).catch(() => {});
        return {
          success: false,
          error: 'Contenu du fichier invalide ou corrompu',
        };
      }

      // 2. Vérification de la taille
      const stats = await fs.promises.stat(filePath);
      if (stats.size > 5 * 1024 * 1024) {
        // 5MB
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
        const { encryptedData, iv, authTag } = this.encryptFile(fileData);

        // Stocker les métadonnées de chiffrement dans un fichier séparé
        const metadataPath = path.join(
          this.uploadDir,
          `${secureFilename}.meta`,
        );
        await fs.promises.writeFile(
          metadataPath,
          JSON.stringify({
            encrypted: true,
            iv,
            authTag,
            originalMimeType,
            createdAt: new Date().toISOString(),
          }),
        );

        await fs.promises.writeFile(finalPath, encryptedData);
      } else {
        // Déplacement simple vers le nom sécurisé
        await fs.promises.rename(filePath, finalPath);
      }

      // 5. Permissions restrictives
      await fs.promises.chmod(finalPath, 0o600); // Lecture/écriture pour le propriétaire seulement

      return { success: true, secureFilename };
    } catch (error) {
      this.logSecure('error', 'Erreur sécurisation fichier', {
        error: error.message,
      });
      // Nettoyage en cas d'erreur
      await fs.promises.unlink(filePath).catch(() => {});
      return {
        success: false,
        error: 'Erreur lors de la sécurisation du fichier',
      };
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
      if (
        await fs.promises
          .access(filePath)
          .then(() => true)
          .catch(() => false)
      ) {
        const stats = await fs.promises.stat(filePath);
        const randomData = crypto.randomBytes(stats.size);
        await fs.promises.writeFile(filePath, randomData);
        await fs.promises.unlink(filePath);

        this.logSecure('info', 'Fichier supprimé de manière sécurisée', {
          filename,
        });
      }

      // Supprimer les métadonnées si elles existent
      await fs.promises.unlink(metadataPath).catch(() => {});
    } catch (error) {
      this.logSecure('error', 'Erreur suppression sécurisée', {
        filename,
        error: error.message,
      });
    }
  }
}
