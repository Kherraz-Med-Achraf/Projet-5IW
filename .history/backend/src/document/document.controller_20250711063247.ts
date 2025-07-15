import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Request,
  Response,
  ParseIntPipe,
  ValidationPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Express } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { DocumentService } from './document.service';
import {
  CreateDocumentDto,
  UpdateDocumentDto,
  PublishDocumentDto,
  DocumentFiltersDto,
  DocumentAccessDto,
} from './dto/document.dto';

@Controller('documents')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DocumentController {
  constructor(private readonly documentService: DocumentService) {}

  /**
   * Créer un nouveau document (SECRETARY)
   */
  @Post()
  @Roles(Role.SECRETARY)
  @UseInterceptors(FileInterceptor('file'))
  async createDocument(
    @Body(ValidationPipe) dto: CreateDocumentDto,
    @UploadedFile() file: Express.Multer.File,
    @Request() req: any,
  ) {
    return this.documentService.createDocument(dto, file, req.user.id);
  }

  /**
   * Publier un document (SECRETARY)
   */
  @Patch(':id/publish')
  @Roles(Role.SECRETARY)
  async publishDocument(
    @Param('id') documentId: string,
    @Request() req: any,
  ) {
    return this.documentService.publishDocument(documentId, req.user.id);
  }

  /**
   * Récupérer la liste des documents selon le rôle
   */
  @Get()
  @Roles(Role.SECRETARY, Role.PARENT)
  async getDocuments(
    @Query(ValidationPipe) filters: DocumentFiltersDto,
    @Request() req: any,
  ) {
    return this.documentService.getDocuments(req.user.id, req.user.role, filters);
  }

  /**
   * Récupérer les KPIs des documents (SECRETARY)
   */
  @Get('kpis/summary')
  @Roles(Role.SECRETARY)
  async getDocumentKPIs() {
    return this.documentService.getDocumentKPIs();
  }

  /**
   * Récupérer la liste des parents pour assignment (SECRETARY)
   */
  @Get('parents/available')
  @Roles(Role.SECRETARY)
  async getParentsForDocuments() {
    return this.documentService.getParentsForDocuments();
  }

  /**
   * Obtenir les détails d'un document spécifique
   */
  @Get(':id')
  @Roles(Role.SECRETARY, Role.PARENT)
  async getDocumentDetails(
    @Param('id') documentId: string,
    @Request() req: any,
  ) {
    return this.documentService.getDocumentDetails(documentId, req.user.id, req.user.role);
  }

  /**
   * Télécharger un document
   */
  @Get(':id/download')
  @Roles(Role.SECRETARY, Role.PARENT)
  async downloadDocument(
    @Param('id') documentId: string,
    @Request() req: any,
    @Response() res: any,
  ) {
    const { buffer, filename, mimetype } = await this.documentService.downloadDocument(
      documentId,
      req.user.id,
      req.user.role,
    );

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', mimetype);
    res.send(buffer);
  }

  /**
   * Supprimer un document (SECRETARY)
   */
  @Delete(':id')
  @Roles(Role.SECRETARY)
  async deleteDocument(
    @Param('id') documentId: string,
    @Request() req: any,
  ) {
    return this.documentService.deleteDocument(documentId, req.user.id);
  }

  /**
   * Ajouter l'accès à un document pour des parents (SECRETARY)
   */
  @Post(':id/access')
  @Roles(Role.SECRETARY)
  async addDocumentAccess(
    @Param('id') documentId: string,
    @Body(ValidationPipe) dto: DocumentAccessDto,
    @Request() req: any,
  ) {
    return this.documentService.addDocumentAccess(documentId, dto.parentIds, req.user.id);
  }

  /**
   * Supprimer l'accès à un document pour des parents (SECRETARY)
   */
  @Delete(':id/access')
  @Roles(Role.SECRETARY)
  async removeDocumentAccess(
    @Param('id') documentId: string,
    @Body(ValidationPipe) dto: DocumentAccessDto,
    @Request() req: any,
  ) {
    return this.documentService.removeDocumentAccess(documentId, dto.parentIds, req.user.id);
  }
} 