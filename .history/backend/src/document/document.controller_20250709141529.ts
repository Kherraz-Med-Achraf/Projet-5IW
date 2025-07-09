import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Req,
  Res,
  StreamableFile,
  ParseIntPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiConsumes,
  ApiParam,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';
import { DocumentService } from './document.service';
import {
  CreateDocumentDto,
  UpdateDocumentDto,
  PublishDocumentDto,
  InitiateSignatureDto,
  DocumentFiltersDto,
  DocumentResponseDto,
  DocumentKPIsDto,
} from './dto/document.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CsrfGuard } from '../common/guards/csrf.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { Request, Response } from 'express';

@ApiTags('Documents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('documents')
export class DocumentController {
  constructor(private readonly documentService: DocumentService) {}

  /**
   * Endpoint pour récupérer la liste des parents (pour sélection lors de création de documents)
   */
  @Get('parents')
  @Roles(Role.SECRETARY, Role.ADMIN, Role.DIRECTOR, Role.SERVICE_MANAGER)
  async getParentsForDocuments() {
    return this.documentService.getParentsForDocuments();
  }

  /**
   * 1. Créer un nouveau document (SECRETARY)
   */
  @Post()
  @Roles(Role.SECRETARY)
  @UseGuards(CsrfGuard)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ 
    summary: 'Créer un nouveau document',
    description: 'Upload et création d\'un document avec assignation aux parents sélectionnés'
  })
  @ApiResponse({ status: 201, description: 'Document créé avec succès' })
  @ApiResponse({ status: 400, description: 'Données invalides ou fichier manquant' })
  async createDocument(
    @Body() dto: CreateDocumentDto,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request & { user: { id: string; role: Role } },
  ) {
    return this.documentService.createDocument(dto, file, req.user.id);
  }

  /**
   * 2. Publier un document (SECRETARY)
   */
  @Post(':id/publish')
  @Roles(Role.SECRETARY)
  @UseGuards(CsrfGuard)
  @ApiOperation({ 
    summary: 'Publier un document',
    description: 'Publier un document en brouillon et envoyer les notifications'
  })
  @ApiParam({ name: 'id', description: 'ID du document' })
  @ApiResponse({ status: 200, description: 'Document publié avec succès' })
  @ApiResponse({ status: 404, description: 'Document introuvable' })
  @ApiResponse({ status: 403, description: 'Vous ne pouvez publier que vos propres documents' })
  async publishDocument(
    @Param('id') documentId: string,
    @Req() req: Request & { user: { id: string; role: Role } },
  ) {
    return this.documentService.publishDocument(documentId, req.user.id);
  }

  /**
   * 3. Lister les documents (ALL ROLES sauf STAFF/CHILD)
   */
  @Get()
  @Roles(Role.SECRETARY, Role.PARENT, Role.DIRECTOR, Role.SERVICE_MANAGER)
  @ApiOperation({ 
    summary: 'Lister les documents',
    description: 'Récupérer la liste des documents selon le rôle utilisateur'
  })
  @ApiQuery({ name: 'category', required: false, description: 'Filtrer par catégorie' })
  @ApiQuery({ name: 'status', required: false, description: 'Filtrer par statut' })
  @ApiQuery({ name: 'requiresSignature', required: false, description: 'Documents nécessitant une signature' })
  @ApiQuery({ name: 'search', required: false, description: 'Recherche par titre' })
  @ApiQuery({ name: 'limit', required: false, description: 'Nombre d\'éléments par page' })
  @ApiQuery({ name: 'offset', required: false, description: 'Décalage pour la pagination' })
  @ApiResponse({ status: 200, description: 'Liste des documents récupérée' })
  async getDocuments(
    @Query() filters: DocumentFiltersDto,
    @Req() req: Request & { user: { id: string; role: Role } },
  ) {
    return this.documentService.getDocuments(req.user.id, req.user.role, filters);
  }

  /**
   * 4. Télécharger un document (SECRETARY/PARENT/DIRECTOR/SERVICE_MANAGER)
   */
  @Get(':id/download')
  @Roles(Role.SECRETARY, Role.PARENT, Role.DIRECTOR, Role.SERVICE_MANAGER)
  @ApiOperation({ 
    summary: 'Télécharger un document',
    description: 'Télécharger le fichier PDF d\'un document'
  })
  @ApiParam({ name: 'id', description: 'ID du document' })
  @ApiResponse({ status: 200, description: 'Fichier téléchargé' })
  @ApiResponse({ status: 403, description: 'Accès non autorisé' })
  @ApiResponse({ status: 404, description: 'Document introuvable' })
  async downloadDocument(
    @Param('id') documentId: string,
    @Req() req: Request & { user: { id: string; role: Role } },
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const { buffer, filename, mimetype } = await this.documentService.downloadDocument(
      documentId,
      req.user.id,
      req.user.role,
    );

    res.set({
      'Content-Type': mimetype,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length,
    });

    return new StreamableFile(buffer);
  }

  /**
   * 5. Obtenir les détails d'un document (ALL ROLES sauf STAFF/CHILD)
   */
  @Get(':id')
  @Roles(Role.SECRETARY, Role.PARENT, Role.DIRECTOR, Role.SERVICE_MANAGER)
  @ApiOperation({ 
    summary: 'Obtenir les détails d\'un document',
    description: 'Récupérer les informations détaillées d\'un document'
  })
  @ApiParam({ name: 'id', description: 'ID du document' })
  @ApiResponse({ status: 200, description: 'Détails du document' })
  @ApiResponse({ status: 404, description: 'Document introuvable' })
  async getDocumentDetails(
    @Param('id') documentId: string,
    @Req() req: Request & { user: { id: string; role: Role } },
  ) {
    // Cette méthode sera implémentée dans le service
    // return this.documentService.getDocumentDetails(documentId, req.user.id, req.user.role);
    return { message: 'Détails du document - à implémenter' };
  }

  /**
   * 6. Mettre à jour un document (SECRETARY)
   */
  @Patch(':id')
  @Roles(Role.SECRETARY)
  @UseGuards(CsrfGuard)
  @ApiOperation({ 
    summary: 'Mettre à jour un document',
    description: 'Modifier les informations d\'un document en brouillon'
  })
  @ApiParam({ name: 'id', description: 'ID du document' })
  @ApiResponse({ status: 200, description: 'Document mis à jour' })
  @ApiResponse({ status: 403, description: 'Vous ne pouvez modifier que vos propres documents' })
  async updateDocument(
    @Param('id') documentId: string,
    @Body() dto: UpdateDocumentDto,
    @Req() req: Request & { user: { id: string; role: Role } },
  ) {
    // Cette méthode sera implémentée dans le service
    // return this.documentService.updateDocument(documentId, dto, req.user.id);
    return { message: 'Mise à jour du document - à implémenter' };
  }

  /**
   * 7. Supprimer un document (SECRETARY)
   */
  @Delete(':id')
  @Roles(Role.SECRETARY)
  @UseGuards(CsrfGuard)
  @ApiOperation({ 
    summary: 'Supprimer un document',
    description: 'Supprimer définitivement un document et ses fichiers'
  })
  @ApiParam({ name: 'id', description: 'ID du document' })
  @ApiResponse({ status: 200, description: 'Document supprimé' })
  @ApiResponse({ status: 403, description: 'Vous ne pouvez supprimer que vos propres documents' })
  async deleteDocument(
    @Param('id') documentId: string,
    @Req() req: Request & { user: { id: string; role: Role } },
  ) {
    // Cette méthode sera implémentée dans le service
    // return this.documentService.deleteDocument(documentId, req.user.id);
    return { message: 'Suppression du document - à implémenter' };
  }

  /**
   * 8. Initier une signature Yousign (SECRETARY)
   */
  @Post(':id/signature')
  @Roles(Role.SECRETARY)
  @UseGuards(CsrfGuard)
  @ApiOperation({ 
    summary: 'Initier une signature électronique',
    description: 'Lancer le processus de signature Yousign pour un document'
  })
  @ApiParam({ name: 'id', description: 'ID du document' })
  @ApiResponse({ status: 200, description: 'Signature initiée' })
  @ApiResponse({ status: 400, description: 'Document ne nécessite pas de signature' })
  async initiateSignature(
    @Param('id') documentId: string,
    @Body() dto: InitiateSignatureDto,
    @Req() req: Request & { user: { id: string; role: Role } },
  ) {
    // Cette méthode sera implémentée dans le service avec Yousign
    // return this.documentService.initiateSignature(documentId, dto, req.user.id);
    return { message: 'Initiation signature - à implémenter' };
  }

  /**
   * 9. Obtenir les KPIs (DIRECTOR/SERVICE_MANAGER)
   */
  @Get('dashboard/kpis')
  @Roles(Role.DIRECTOR, Role.SERVICE_MANAGER)
  @ApiOperation({ 
    summary: 'Obtenir les KPIs des documents',
    description: 'Récupérer les indicateurs de performance pour le tableau de bord'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'KPIs récupérés',
    type: DocumentKPIsDto,
  })
  async getDocumentKPIs(): Promise<DocumentKPIsDto> {
    return this.documentService.getDocumentKPIs();
  }

  /**
   * 10. Obtenir le nombre de documents en attente de signature (PARENT)
   */
  @Get('pending-signatures/count')
  @Roles(Role.PARENT)
  @ApiOperation({ 
    summary: 'Obtenir le nombre de signatures en attente',
    description: 'Récupérer le nombre de documents en attente de signature pour ce parent'
  })
  @ApiResponse({ status: 200, description: 'Nombre de signatures en attente' })
  async getPendingSignaturesCount(
    @Req() req: Request & { user: { id: string; role: Role } },
  ) {
    // Cette méthode sera implémentée dans le service
    // return this.documentService.getPendingSignaturesCount(req.user.id);
    return { pendingCount: 0, message: 'Compteur signatures - à implémenter' };
  }

  /**
   * 11. Marquer un document comme consulté (PARENT)
   */
  @Post(':id/mark-viewed')
  @Roles(Role.PARENT)
  @ApiOperation({ 
    summary: 'Marquer un document comme consulté',
    description: 'Enregistrer la consultation d\'un document par un parent'
  })
  @ApiParam({ name: 'id', description: 'ID du document' })
  @ApiResponse({ status: 200, description: 'Document marqué comme consulté' })
  async markDocumentAsViewed(
    @Param('id') documentId: string,
    @Req() req: Request & { user: { id: string; role: Role } },
  ) {
    // Cette méthode sera implémentée dans le service
    // return this.documentService.markAsViewed(documentId, req.user.id);
    return { message: 'Marquer comme consulté - à implémenter' };
  }

  /**
   * 12. Webhooks Yousign (PUBLIC pour recevoir les callbacks)
   */
  @Post('webhook/yousign')
  @ApiOperation({ 
    summary: 'Webhook Yousign',
    description: 'Recevoir les callbacks de Yousign pour mettre à jour le statut des signatures'
  })
  @ApiResponse({ status: 200, description: 'Webhook traité' })
  async handleYousignWebhook(
    @Body() webhookData: any,
    @Req() req: Request,
  ) {
    // Cette méthode sera implémentée dans le service
    // return this.documentService.handleYousignWebhook(webhookData);
    return { message: 'Webhook Yousign - à implémenter' };
  }
} 