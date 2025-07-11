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
  private readonly uploadDir = path.join(process.cwd(), 'uploads', 'documents');
  private readonly encryptionKey: Buffer;

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly youSignService: YouSignService,
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
            canDownload: true, // 🔧 FIX: Toujours permettre le téléchargement si accès accordé
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
      try {
        await this.initiateSignatures(documentId, 
          document.accesses.map(access => access.parentId)
        );
      } catch (error) {
        console.error('⚠️ Erreur initiation signatures (non-bloquant):', error.message);
        // Continuer même si Yousign échoue
      }
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
          } : userRole === Role.SECRETARY ? {
            select: {
              viewedAt: true,
              downloadedAt: true,
              canView: true,
              canDownload: true,
              parent: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  user: {
                    select: {
                      email: true,
                    },
                  },
                },
              },
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
   * Initier les signatures Yousign
   */
  private async initiateSignatures(documentId: string, parentIds: number[]) {
    try {
      console.log(`🔏 Initiating YouSign signatures for document ${documentId}, parents:`, parentIds);
      
      // Récupérer le document et ses détails
      const document = await this.prisma.document.findUnique({
        where: { id: documentId },
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

      if (!document) {
        throw new NotFoundException('Document introuvable');
      }

      // Lire le document chiffré
      const filepath = path.join(this.uploadDir, document.filepath);
      const metaFilepath = `${filepath}.meta`;
      
      const [encryptedBuffer, metaData] = await Promise.all([
        fs.readFile(filepath),
        fs.readFile(metaFilepath, 'utf-8').then(data => JSON.parse(data)),
      ]);

      // Déchiffrer le document
      const decryptedBuffer = await this.decryptFile(
        encryptedBuffer,
        metaData.iv,
        metaData.authTag,
      );

      // Préparer les signataires
      const signers = document.accesses
        .filter(access => parentIds.includes(access.parentId))
        .map(access => ({
          firstName: access.parent.firstName,
          lastName: access.parent.lastName,
          email: access.parent.user.email,
          phone: undefined, // Optionnel
        }));

      if (signers.length === 0) {
        throw new BadRequestException('Aucun signataire valide trouvé');
      }

      // Créer l'URL de webhook
      const webhookUrl = `${getFrontendBaseUrl()}/api/yousign/webhook`;

      // Créer et activer la demande de signature YouSign
      const signatureResponse = await this.youSignService.createAndActivateSignature(
        decryptedBuffer,
        document.filename,
        signers,
        {
          documentId: document.id,
          title: document.title,
          category: document.category,
        },
        webhookUrl
      );

      // Mettre à jour le document avec l'ID YouSign
      await this.prisma.document.update({
        where: { id: documentId },
        data: {
          youSignRequestId: signatureResponse.id,
        },
      });

      // Mettre à jour les signatures individuelles
      const signatureUpdates = document.accesses
        .filter(access => parentIds.includes(access.parentId))
        .map(access => 
          this.prisma.documentSignature.upsert({
            where: {
              documentId_parentId: {
                documentId: document.id,
                parentId: access.parentId,
              },
            },
            update: {
              yousignProcedureId: signatureResponse.id,
              status: SignatureStatus.PENDING,
            },
            create: {
              documentId: document.id,
              parentId: access.parentId,
              yousignProcedureId: signatureResponse.id,
              status: SignatureStatus.PENDING,
            },
          })
        );

      await Promise.all(signatureUpdates);

      console.log(`✅ YouSign signatures initiated successfully for document ${documentId}`);
      console.log(`📧 ${signers.length} signataires notifiés via YouSign`);

    } catch (error) {
      console.error('❌ Failed to initiate YouSign signatures:', error.message);
      throw error;
    }
  }

  /**
   * Obtenir le lien de signature YouSign pour un parent
   */
  async getYouSignSignatureLink(documentId: string, userId: string) {
    try {
      // Trouver le profil parent
      const parentProfile = await this.prisma.parentProfile.findUnique({
        where: { userId },
        select: { id: true, firstName: true, lastName: true, user: { select: { email: true } } },
      });

      if (!parentProfile) {
        throw new NotFoundException('Profil parent introuvable');
      }

      // Trouver le document et vérifier l'accès
      const document = await this.prisma.document.findUnique({
        where: { id: documentId },
        include: {
          accesses: {
            where: { parentId: parentProfile.id },
          },
          signatures: {
            where: { parentId: parentProfile.id },
          },
        },
      });

      if (!document) {
        throw new NotFoundException('Document introuvable');
      }

      if (document.accesses.length === 0) {
        throw new ForbiddenException('Vous n\'avez pas accès à ce document');
      }

      if (!document.requiresSignature) {
        throw new BadRequestException('Ce document ne nécessite pas de signature');
      }

      if (!document.youSignRequestId) {
        throw new BadRequestException('Aucune demande de signature YouSign associée');
      }

      // Vérifier le statut de la signature
      const signature = document.signatures[0];
      if (signature?.status === SignatureStatus.SIGNED) {
        throw new BadRequestException('Document déjà signé');
      }

      // Obtenir le lien de signature depuis YouSign
      const signatureLink = await this.youSignService.getSignatureLink(
        document.youSignRequestId,
        `signer-${parentProfile.id}`
      );

      return { signatureLink };

    } catch (error) {
      console.error('❌ Failed to get signature link:', error.message);
      throw error;
    }
  }

  /**
   * Marquer un document comme consulté
   */
  async markDocumentAsViewed(documentId: string, userId: string) {
    try {
      // Trouver le profil parent
      const parentProfile = await this.prisma.parentProfile.findUnique({
        where: { userId },
        select: { id: true },
      });

      if (!parentProfile) {
        throw new NotFoundException('Profil parent introuvable');
      }

      // Mettre à jour l'accès au document
      const updatedAccess = await this.prisma.documentAccess.updateMany({
        where: {
          documentId,
          parentId: parentProfile.id,
        },
        data: {
          viewedAt: new Date(),
        },
      });

      if (updatedAccess.count === 0) {
        throw new NotFoundException('Accès au document introuvable');
      }

      console.log(`👁️ Document ${documentId} marqué comme consulté par parent ${parentProfile.id}`);
      
      return { message: 'Document marqué comme consulté' };

    } catch (error) {
      console.error('❌ Failed to mark document as viewed:', error.message);
      throw error;
    }
  }

  /**
   * Initier une signature pour un document spécifique (endpoint public)
   */
  async initiateSignature(
    documentId: string,
    dto: InitiateSignatureDto,
    userId: string,
  ) {
    // Vérifier que le document existe et appartient au secrétaire
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
      include: {
        accesses: {
          where: { parentId: { in: dto.parentIds } },
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
      throw new ForbiddenException('Vous ne pouvez initier une signature que pour vos propres documents');
    }

    if (!document.requiresSignature) {
      throw new BadRequestException('Ce document ne nécessite pas de signature');
    }

    if (document.youSignRequestId) {
      throw new BadRequestException('Une demande de signature a déjà été créée pour ce document');
    }

    // Vérifier que tous les parents ont accès au document
    const accessibleParentIds = document.accesses.map(a => a.parentId);
    const invalidParentIds = dto.parentIds.filter(id => !accessibleParentIds.includes(id));
    
    if (invalidParentIds.length > 0) {
      throw new BadRequestException(`Les parents suivants n'ont pas accès au document: ${invalidParentIds.join(', ')}`);
    }

    // Initier les signatures
    await this.initiateSignatures(documentId, dto.parentIds);

    console.log(`🔏 Signature manuelle initiée pour le document ${documentId} par ${userId}`);
    
    return {
      message: 'Signature initiée avec succès',
      documentId,
      parentIds: dto.parentIds,
      youSignRequestId: document.youSignRequestId,
    };
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