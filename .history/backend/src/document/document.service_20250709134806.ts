import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import {
  CreateDocumentDto,
  UpdateDocumentDto,
  PublishDocumentDto,
  InitiateSignatureDto,
  DocumentFiltersDto,
  DocumentKPIsDto,
} from './dto/document.dto';
import {
  DocumentCategory,
  DocumentStatus,
  SignatureStatus,
  Role,
} from '@prisma/client';
import * as crypto from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';
import { readSecret } from '../utils/secret';

@Injectable()
export class DocumentService {
  private readonly uploadDir = path.join(process.cwd(), 'uploads', 'documents');
  private readonly encryptionKey: Buffer;

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {
    // Initialiser la clé de chiffrement
    const keyString = readSecret('/run/secrets/file_encryption_key', 'FILE_ENCRYPTION_KEY');
    this.encryptionKey = Buffer.from(keyString.padEnd(32, '0').slice(0, 32));
    
    // Créer le répertoire d'upload s'il n'existe pas
    this.ensureUploadDirectory();
  }

  private async ensureUploadDirectory() {
    try {
      await fs.mkdir(this.uploadDir, { recursive: true });
    } catch (error) {
      console.error('Erreur lors de la création du répertoire uploads:', error);
    }
  }

  /**
   * Chiffrer un fichier
   */
  private async encryptFile(buffer: Buffer): Promise<{
    encryptedBuffer: Buffer;
    iv: string;
    authTag: string;
  }> {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.encryptionKey, iv);
    
    const encrypted = Buffer.concat([
      cipher.update(buffer),
      cipher.final(),
    ]);
    
    const authTag = cipher.getAuthTag();
    
    return {
      encryptedBuffer: encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
    };
  }

  /**
   * Déchiffrer un fichier
   */
  private async decryptFile(
    encryptedBuffer: Buffer,
    iv: string,
    authTag: string,
  ): Promise<Buffer> {
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      this.encryptionKey,
      Buffer.from(iv, 'hex'),
    );
    
    decipher.setAuthTag(Buffer.from(authTag, 'hex'));
    
    return Buffer.concat([
      decipher.update(encryptedBuffer),
      decipher.final(),
    ]);
  }

  /**
   * Créer un nouveau document
   */
  async createDocument(
    dto: CreateDocumentDto,
    file: Express.Multer.File,
    userId: string,
  ) {
    // Validation du fichier
    if (!file) {
      throw new BadRequestException('Fichier manquant');
    }

    if (file.mimetype !== 'application/pdf') {
      throw new BadRequestException('Seuls les fichiers PDF sont acceptés');
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB max
      throw new BadRequestException('Fichier trop volumineux (max 10MB)');
    }

    // Vérifier que les parents existent
    const parents = await this.prisma.parentProfile.findMany({
      where: { id: { in: dto.parentIds } },
      select: { id: true },
    });

    if (parents.length !== dto.parentIds.length) {
      throw new BadRequestException('Un ou plusieurs parents sont introuvables');
    }

    // Chiffrer le fichier
    const { encryptedBuffer, iv, authTag } = await this.encryptFile(file.buffer);
    
    // Générer un nom de fichier sécurisé
    const secureFilename = `${crypto.randomUUID()}.pdf`;
    const filepath = path.join(this.uploadDir, secureFilename);
    
    // Sauvegarder le fichier chiffré
    await fs.writeFile(filepath, encryptedBuffer);
    
    // Sauvegarder les métadonnées de chiffrement
    const metaFilepath = `${filepath}.meta`;
    await fs.writeFile(
      metaFilepath,
      JSON.stringify({
        iv,
        authTag,
        originalFilename: file.originalname,
        originalMimeType: file.mimetype,
        encrypted: true,
        createdAt: new Date().toISOString(),
      }),
    );

    // Créer le document en base
    const document = await this.prisma.document.create({
      data: {
        title: dto.title,
        description: dto.description,
        category: dto.category,
        requiresSignature: dto.requiresSignature,
        filename: file.originalname,
        filepath: secureFilename,
        filesize: file.size,
        mimetype: file.mimetype,
        isEncrypted: true,
        uploadedById: userId,
        accesses: {
          create: dto.parentIds.map(parentId => ({
            parentId,
            canView: true,
            canDownload: !dto.requiresSignature, // Si signature requise, téléchargement après signature
          })),
        },
      },
      include: {
        uploadedBy: {
          select: {
            id: true,
            email: true,
            secretaryProfile: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        accesses: {
          include: {
            parent: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                user: { select: { email: true } },
              },
            },
          },
        },
      },
    });

    console.log(`📄 Document créé: ${document.title} (${document.id})`);
    
    return document;
  }

  /**
   * Publier un document et envoyer les notifications
   */
  async publishDocument(documentId: string, userId: string) {
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
      include: {
        uploadedBy: true,
        accesses: {
          include: {
            parent: {
              include: {
                user: { select: { email: true } },
              },
            },
          },
        },
      },
    });

    if (!document) {
      throw new NotFoundException('Document introuvable');
    }

    if (document.uploadedById !== userId) {
      throw new ForbiddenException('Vous ne pouvez publier que vos propres documents');
    }

    if (document.status !== DocumentStatus.DRAFT) {
      throw new BadRequestException('Seuls les brouillons peuvent être publiés');
    }

    // Mettre à jour le statut
    const updatedDocument = await this.prisma.document.update({
      where: { id: documentId },
      data: {
        status: DocumentStatus.PUBLISHED,
        publishedAt: new Date(),
      },
      include: {
        accesses: {
          include: {
            parent: {
              include: {
                user: { select: { email: true } },
              },
            },
          },
        },
      },
    });

    // Envoyer les notifications par email
    await this.sendDocumentNotifications(updatedDocument);

    // Si signature requise, initier les procédures Yousign
    if (document.requiresSignature) {
      await this.initiateSignatures(documentId, 
        document.accesses.map(access => access.parentId)
      );
    }

    console.log(`📢 Document publié: ${document.title} (${document.id})`);
    
    return updatedDocument;
  }

  /**
   * Récupérer les documents selon le rôle utilisateur
   */
  async getDocuments(
    userId: string,
    userRole: Role,
    filters: DocumentFiltersDto,
  ) {
    const {
      category,
      status,
      requiresSignature,
      search,
      limit = 10,
      offset = 0,
    } = filters;

    let whereClause: any = {};

    // Filtres par rôle
    if (userRole === Role.SECRETARY) {
      // Secrétaire voit ses propres documents
      whereClause.uploadedById = userId;
    } else if (userRole === Role.PARENT) {
      // Parent voit uniquement les documents qui lui sont assignés et publiés
      const parentProfile = await this.prisma.parentProfile.findUnique({
        where: { userId },
        select: { id: true },
      });

      if (!parentProfile) {
        throw new NotFoundException('Profil parent introuvable');
      }

      whereClause = {
        status: DocumentStatus.PUBLISHED,
        accesses: {
          some: {
            parentId: parentProfile.id,
          },
        },
      };
    } else if (userRole === Role.DIRECTOR || userRole === Role.SERVICE_MANAGER) {
      // Directeur/Service Manager voient tous les documents publiés
      whereClause.status = DocumentStatus.PUBLISHED;
    } else {
      throw new ForbiddenException('Accès non autorisé aux documents');
    }

    // Appliquer les filtres supplémentaires
    if (category) whereClause.category = category;
    if (status && userRole !== Role.PARENT) whereClause.status = status;
    if (requiresSignature !== undefined) whereClause.requiresSignature = requiresSignature;
    if (search) {
      whereClause.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [documents, total] = await Promise.all([
      this.prisma.document.findMany({
        where: whereClause,
        include: {
          uploadedBy: {
            select: {
              id: true,
              email: true,
              secretaryProfile: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
          accesses: userRole === Role.PARENT ? {
            where: {
              parent: { userId },
            },
            select: {
              viewedAt: true,
              downloadedAt: true,
            },
          } : false,
          signatures: userRole === Role.PARENT ? {
            where: {
              parent: { userId },
            },
            select: {
              status: true,
              signedAt: true,
            },
          } : {
            select: {
              status: true,
              signedAt: true,
              parent: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
          _count: {
            select: {
              accesses: true,
              signatures: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      this.prisma.document.count({ where: whereClause }),
    ]);

    return {
      documents,
      pagination: {
        total,
        limit,
        offset,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Télécharger un document
   */
  async downloadDocument(documentId: string, userId: string, userRole: Role) {
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
      include: {
        accesses: {
          include: {
            parent: {
              include: {
                user: { select: { id: true } },
              },
            },
          },
        },
      },
    });

    if (!document) {
      throw new NotFoundException('Document introuvable');
    }

    // Vérifier les permissions
    let canDownload = false;

    if (userRole === Role.SECRETARY && document.uploadedById === userId) {
      canDownload = true;
    } else if (userRole === Role.PARENT) {
      const access = document.accesses.find(a => a.parent.user?.id === userId);
      canDownload = access?.canDownload || false;
    } else if (userRole === Role.DIRECTOR || userRole === Role.SERVICE_MANAGER) {
      canDownload = document.status === DocumentStatus.PUBLISHED;
    }

    if (!canDownload) {
      throw new ForbiddenException('Vous n\'avez pas l\'autorisation de télécharger ce document');
    }

    // Lire le fichier chiffré et ses métadonnées
    const filepath = path.join(this.uploadDir, document.filepath);
    const metaFilepath = `${filepath}.meta`;

    try {
      const [encryptedBuffer, metaData] = await Promise.all([
        fs.readFile(filepath),
        fs.readFile(metaFilepath, 'utf-8').then(data => JSON.parse(data)),
      ]);

      // Déchiffrer le fichier
      const decryptedBuffer = await this.decryptFile(
        encryptedBuffer,
        metaData.iv,
        metaData.authTag,
      );

      // Marquer comme téléchargé pour les parents
      if (userRole === Role.PARENT) {
        const parentProfile = await this.prisma.parentProfile.findUnique({
          where: { userId },
          select: { id: true },
        });

        if (parentProfile) {
          await this.prisma.documentAccess.updateMany({
            where: {
              documentId,
              parentId: parentProfile.id,
            },
            data: {
              downloadedAt: new Date(),
            },
          });
        }
      }

      return {
        buffer: decryptedBuffer,
        filename: document.filename,
        mimetype: document.mimetype,
      };
    } catch (error) {
      console.error('Erreur lors du téléchargement:', error);
      throw new InternalServerErrorException('Erreur lors du téléchargement du document');
    }
  }

  /**
   * Obtenir les KPIs pour directeur/service manager
   */
  async getDocumentKPIs(): Promise<DocumentKPIsDto> {
    const [
      totalDocuments,
      publishedDocuments,
      documentsRequiringSignature,
      allSignatures,
      documentsByCategory,
      recentDocuments,
      recentSignatures,
    ] = await Promise.all([
      this.prisma.document.count(),
      this.prisma.document.count({ where: { status: DocumentStatus.PUBLISHED } }),
      this.prisma.document.count({ where: { requiresSignature: true } }),
      this.prisma.documentSignature.findMany({
        select: {
          status: true,
          createdAt: true,
          signedAt: true,
        },
      }),
      this.prisma.document.groupBy({
        by: ['category'],
        _count: { id: true },
      }),
      this.prisma.document.count({
        where: {
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      }),
      this.prisma.documentSignature.count({
        where: {
          signedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          status: SignatureStatus.SIGNED,
        },
      }),
    ]);

    const pendingSignatures = allSignatures.filter(s => s.status === SignatureStatus.PENDING).length;
    const completedSignatures = allSignatures.filter(s => s.status === SignatureStatus.SIGNED).length;
    const signatureRate = allSignatures.length > 0 ? (completedSignatures / allSignatures.length) * 100 : 0;

    // Calculer le temps moyen de signature
    const signedSignatures = allSignatures.filter(s => s.signedAt);
    const averageSignatureTime = signedSignatures.length > 0
      ? signedSignatures.reduce((acc, sig) => {
          const diffMs = new Date(sig.signedAt!).getTime() - new Date(sig.createdAt).getTime();
          return acc + (diffMs / (1000 * 60 * 60)); // en heures
        }, 0) / signedSignatures.length
      : 0;

    // Transformer les résultats groupés
    const categoryCounts = Object.fromEntries(
      Object.values(DocumentCategory).map(cat => [cat, 0])
    );
    documentsByCategory.forEach(group => {
      categoryCounts[group.category] = group._count.id;
    });

    return {
      totalDocuments,
      publishedDocuments,
      documentsRequiringSignature,
      pendingSignatures,
      completedSignatures,
      signatureRate: Math.round(signatureRate * 100) / 100,
      averageSignatureTime: Math.round(averageSignatureTime * 100) / 100,
      documentsByCategory: categoryCounts as Record<DocumentCategory, number>,
      recentActivity: {
        documentsUploadedThisWeek: recentDocuments,
        signaturesCompletedThisWeek: recentSignatures,
        activeReminders: pendingSignatures, // Simplification pour maintenant
      },
    };
  }

  /**
   * Envoyer les notifications par email
   */
  private async sendDocumentNotifications(document: any) {
    for (const access of document.accesses) {
      if (access.parent.user?.email) {
        const subject = `Nouveau document disponible: ${document.title}`;
        const isSignatureRequired = document.requiresSignature;
        
        const body = `
          <h2>Nouveau document disponible</h2>
          <p>Bonjour ${access.parent.firstName} ${access.parent.lastName},</p>
          <p>Un nouveau document est disponible pour vous :</p>
          <ul>
            <li><strong>Titre :</strong> ${document.title}</li>
            <li><strong>Catégorie :</strong> ${document.category}</li>
            ${document.description ? `<li><strong>Description :</strong> ${document.description}</li>` : ''}
            ${isSignatureRequired ? '<li><strong>⚠️ Signature requise</strong></li>' : ''}
          </ul>
          <p>
            ${isSignatureRequired 
              ? 'Vous recevrez prochainement un email de signature électronique.' 
              : 'Vous pouvez dès maintenant consulter ce document dans votre espace parent.'
            }
          </p>
          <p>Cordialement,<br>L'équipe pédagogique</p>
        `;

        try {
          await this.mailService.sendMail(access.parent.user.email, subject, body);
          
          // Marquer comme notifié
          await this.prisma.documentAccess.update({
            where: { id: access.id },
            data: { notifiedAt: new Date() },
          });
        } catch (error) {
          console.error(`Erreur envoi email à ${access.parent.user.email}:`, error);
        }
      }
    }
  }

  /**
   * Initier les signatures Yousign (placeholder pour maintenant)
   */
  private async initiateSignatures(documentId: string, parentIds: number[]) {
    // TODO: Implémenter l'intégration Yousign
    console.log(`🔏 Initiation signatures pour document ${documentId}, parents:`, parentIds);
    
    // Pour l'instant, créer les enregistrements de signature en attente
    const signatureData = parentIds.map(parentId => ({
      documentId,
      parentId,
      status: SignatureStatus.PENDING,
    }));

    await this.prisma.documentSignature.createMany({
      data: signatureData,
    });
  }
} 