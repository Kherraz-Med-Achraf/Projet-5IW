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
import { YouSignService } from '../yousign/yousign.service';
import { getFrontendBaseUrl } from '../utils/frontend-url';

@Injectable()
export class DocumentService {
  private readonly uploadDir: string;
  private readonly encryptionKey: Buffer;

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly youSignService: YouSignService,
  ) {
    // Initialiser la clé de chiffrement
    this.encryptionKey = Buffer.from(
      process.env.ENCRYPTION_KEY || 'your-32-byte-secret-key-here-123456',
      'utf-8',
    );
    
    // Définir le répertoire d'upload
    this.uploadDir = path.join(process.cwd(), 'uploads', 'documents');
    
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
            canDownload: true,
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
              },
              include: {
                user: { select: { email: true } },
              },
            },
          },
        },
      },
    });

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
      throw new NotFoundException('Document non trouvé');
    }

    if (document.uploadedById !== userId) {
      throw new ForbiddenException('Vous ne pouvez pas publier ce document');
    }

    if (document.status === 'PUBLISHED') {
      throw new BadRequestException('Le document est déjà publié');
    }

    // Mettre à jour le statut du document
    const updatedDocument = await this.prisma.document.update({
      where: { id: documentId },
      data: {
        status: 'PUBLISHED',
        publishedAt: new Date(),
      },
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

    // Envoyer les notifications par email
    await this.sendDocumentNotifications(updatedDocument);

    return updatedDocument;
  }

  /**
   * Récupérer la liste des documents selon le rôle
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
    } else {
      throw new ForbiddenException('Accès non autorisé');
    }

    // Filtres communs
    if (category) {
      whereClause.category = category;
    }

    if (status) {
      whereClause.status = status;
    }

    if (requiresSignature !== undefined) {
      whereClause.requiresSignature = requiresSignature;
    }

    if (search) {
      whereClause.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Construire les inclusions selon le rôle
    const includeClause: any = {
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
      _count: {
        select: {
          accesses: true,
        },
      },
    };

    if (userRole === Role.PARENT) {
      const parentProfile = await this.prisma.parentProfile.findUnique({
        where: { userId },
        select: { id: true },
      });

      includeClause.accesses = {
        where: { parentId: parentProfile!.id },
        select: {
          canView: true,
          canDownload: true,
          viewedAt: true,
          downloadedAt: true,
        },
      };
    }

    // Exécuter la requête
    const [documents, total] = await Promise.all([
      this.prisma.document.findMany({
        where: whereClause,
        include: includeClause,
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      this.prisma.document.count({ where: whereClause }),
    ]);

    // Formatage des résultats
    const formattedDocuments = documents.map(doc => ({
      ...doc,
      access: userRole === Role.PARENT ? doc.accesses?.[0] : undefined,
      accesses: userRole === Role.SECRETARY ? doc.accesses : undefined,
    }));

    return {
      documents: formattedDocuments,
      pagination: {
        total,
        limit,
        offset,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Supprimer un document et ses fichiers associés
   */
  async deleteDocument(documentId: string, userId: string) {
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
      include: {
        accesses: true,
        signatures: true,
      },
    });

    if (!document) {
      throw new NotFoundException('Document introuvable');
    }

    if (document.uploadedById !== userId) {
      throw new ForbiddenException('Vous ne pouvez supprimer que vos propres documents');
    }

    // Supprimer les fichiers du disque
    const filepath = path.join(this.uploadDir, document.filepath);
    const metaFilepath = `${filepath}.meta`;

    try {
      await Promise.all([
        fs.unlink(filepath).catch(() => {}), // Ignorer si le fichier n'existe pas
        fs.unlink(metaFilepath).catch(() => {}), // Ignorer si le métafichier n'existe pas
      ]);
    } catch (error) {
      console.error('Erreur lors de la suppression des fichiers:', error);
      // Continuer même si la suppression des fichiers échoue
    }

    // Supprimer le document de la base de données
    // Les accès et signatures sont supprimés automatiquement grâce aux relations CASCADE
    await this.prisma.document.delete({
      where: { id: documentId },
    });

    console.log(`🗑️ Document supprimé: ${document.title} (${documentId})`);
    
    return {
      message: 'Document supprimé avec succès',
      deletedDocument: {
        id: documentId,
        title: document.title,
        filename: document.filename,
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
      // 🔧 FIX: Les parents peuvent télécharger s'ils ont accès, même si signature requise
      // Ils doivent pouvoir voir le document pour le signer
      canDownload = !!access;
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
   * Récupérer la liste des parents pour la création de documents
   */
  async getParentsForDocuments() {
    return this.prisma.parentProfile.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        user: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },
        children: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: [
        { lastName: 'asc' },
        { firstName: 'asc' },
      ],
    });
  }

  /**
   * Obtenir les détails complets d'un document
   */
  async getDocumentDetails(documentId: string, userId: string, userRole: Role) {
    let whereClause: any = { id: documentId };
    let includeClause: any = {
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
              user: {
                select: {
                  id: true,
                  email: true,
                },
              },
            },
          },
        },
      },
      signatures: {
        include: {
          parent: {
            select: {
              id: true,
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
    };

    // Vérifications de permission selon le rôle
    if (userRole === Role.SECRETARY) {
      // Secrétaire voit seulement ses propres documents
      whereClause.uploadedById = userId;
    } else if (userRole === Role.PARENT) {
      // Parent voit seulement les documents qui lui sont assignés et publiés
      const parentProfile = await this.prisma.parentProfile.findUnique({
        where: { userId },
        select: { id: true },
      });

      if (!parentProfile) {
        throw new NotFoundException('Profil parent introuvable');
      }

      whereClause = {
        id: documentId,
        status: DocumentStatus.PUBLISHED,
        accesses: {
          some: { parentId: parentProfile.id },
        },
      };

      // Limiter les données pour les parents
      includeClause.accesses = {
        where: { parentId: parentProfile.id },
        select: {
          viewedAt: true,
          downloadedAt: true,
          canView: true,
          canDownload: true,
        },
      };
      includeClause.signatures = {
        where: { parentId: parentProfile.id },
        select: {
          status: true,
          signedAt: true,
        },
      };
    } else if (userRole === Role.DIRECTOR || userRole === Role.SERVICE_MANAGER) {
      // Directeur/Service Manager voient tous les documents publiés
      whereClause.status = DocumentStatus.PUBLISHED;
    } else {
      throw new ForbiddenException('Accès non autorisé aux documents');
    }

    const document = await this.prisma.document.findUnique({
      where: whereClause,
      include: includeClause,
    });

    if (!document) {
      throw new NotFoundException('Document introuvable ou accès non autorisé');
    }

    console.log(`📄 Détails document récupérés: ${document.title} (${document.id})`);
    
    return document;
  }

  /**
   * Ajouter l'accès à un document pour des parents spécifiques (SECRETARY)
   */
  async addDocumentAccess(
    documentId: string,
    parentIds: number[],
    userId: string,
  ) {
    // Vérifier que le document existe et appartient au secrétaire
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
      select: { id: true, uploadedById: true, status: true, title: true },
    });

    if (!document) {
      throw new NotFoundException('Document introuvable');
    }

    if (document.uploadedById !== userId) {
      throw new ForbiddenException('Vous ne pouvez modifier que vos propres documents');
    }

    // Vérifier que tous les parents existent
    const parents = await this.prisma.parentProfile.findMany({
      where: { id: { in: parentIds } },
      select: { id: true, firstName: true, lastName: true },
    });

    if (parents.length !== parentIds.length) {
      throw new BadRequestException('Un ou plusieurs parents sont introuvables');
    }

    // Créer les accès (ignorer si déjà existants)
    const accessesToCreate = parentIds.map(parentId => ({
      documentId: document.id,
      parentId,
      canView: true,
      canDownload: true, // 🔧 FIX: Toujours permettre le téléchargement si accès accordé
    }));

    await this.prisma.documentAccess.createMany({
      data: accessesToCreate,
      skipDuplicates: true,
    });

    console.log(`➕ Accès ajoutés au document ${document.title} pour ${parentIds.length} parent(s)`);

    return {
      message: 'Accès ajoutés avec succès',
      addedParents: parents,
      documentId: document.id,
    };
  }

  /**
   * Retirer l'accès à un document pour des parents spécifiques (SECRETARY)
   */
  async removeDocumentAccess(
    documentId: string,
    parentIds: number[],
    userId: string,
  ) {
    // Vérifier que le document existe et appartient au secrétaire
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
      select: { id: true, uploadedById: true, title: true },
    });

    if (!document) {
      throw new NotFoundException('Document introuvable');
    }

    if (document.uploadedById !== userId) {
      throw new ForbiddenException('Vous ne pouvez modifier que vos propres documents');
    }

    // Supprimer les accès
    const deletedAccesses = await this.prisma.documentAccess.deleteMany({
      where: {
        documentId: document.id,
        parentId: { in: parentIds },
      },
    });

    // Supprimer également les signatures associées si elles existent
    await this.prisma.documentSignature.deleteMany({
      where: {
        documentId: document.id,
        parentId: { in: parentIds },
      },
    });

    console.log(`➖ Accès retirés du document ${document.title} pour ${deletedAccesses.count} parent(s)`);

    return {
      message: 'Accès retirés avec succès',
      removedCount: deletedAccesses.count,
      documentId: document.id,
    };
  }
} 