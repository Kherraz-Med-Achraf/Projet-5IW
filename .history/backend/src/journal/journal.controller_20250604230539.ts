// src/journal/journal.controller.ts

import {
    Controller,
    Get,
    Param,
    Query,
    ParseIntPipe,
    Body,
    Post,
    Patch,
    Delete,
    UseGuards,
    UploadedFile,
    UseInterceptors,
    ForbiddenException,
    NotFoundException,
    BadRequestException,
  } from '@nestjs/common';
  import { FileInterceptor } from '@nestjs/platform-express';
  import { diskStorage } from 'multer';
  import { extname, join } from 'path';
  import { Express } from 'express';
  
  import { JournalService } from './journal.service';
  import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
  import { RolesGuard } from '../common/guards/roles.guard';
  import { Roles } from '../common/decorators/roles.decorator';
  import { User } from '../common/decorators/user.decorator';
  
  import { CreateJournalDto } from './dto/create-journal.dto';
  import { UpdateJournalDto } from './dto/update-journal.dto';
  import { ReopenJournalDto } from './dto/reopen-journal.dto';
  
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Controller('journal')
  export class JournalController {
    constructor(private readonly service: JournalService) {}
  
    /**
     * GET /journal/child/:childId?yearId=…
     *
     * Lecture des journaux pour un enfant et une année scolaire.
     * Autorisé pour :
     *  - STAFF, DIRECTOR, ADMIN, SERVICE_MANAGER
     *  - PARENT (uniquement si c’est le parent de l’enfant)
     */
    @Roles('STAFF', 'DIRECTOR', 'ADMIN', 'SERVICE_MANAGER', 'PARENT')
    @Get('child/:childId')
    async findByChildAndYear(
      @User() user: { id: string; role: string },
      @Param('childId', ParseIntPipe) childId: number,
      @Query('yearId', ParseIntPipe) academicYearId: number,
    ) {
      // Si c’est un parent, vérifier qu’il est bien le parent de cet enfant
      if (user.role === 'PARENT') {
        const belongsToParent = await this.service.verifyChildBelongsToParent(
          childId,
          user.id,
        );
        if (!belongsToParent) {
          throw new ForbiddenException(
            'Vous n’êtes pas autorisé·e à consulter ce journal.',
          );
        }
      }
  
      return this.service.findByChildAndYear(childId, academicYearId);
    }
  
    /**
     * POST /journal
     *
     * Création d’un nouveau brouillon (JournalMensuel).
     * Seuls STAFF et ADMIN peuvent créer.
     */
    @Roles('STAFF', 'ADMIN')
    @Post()
    async create(
      @Body() dto: CreateJournalDto,
      @User() user: { id: string; role: string },
    ) {
      return this.service.create({
        child: { connect: { id: dto.childId } },
        educator: { connect: { id: user.id } },
        academicYear: { connect: { id: dto.academicYearId } },
        month: dto.month,
        contenu: dto.contenu ?? '',
        progressionMissions: dto.progressionMissions ?? {},
        isDraft: true,
        isSubmitted: false,
      });
    }
  
    /**
     * PATCH /journal/:journalId
     *
     * Mise à jour d’un brouillon existant.
     * Seul ADMIN peut mettre à jour.
     */
    @Roles('ADMIN')
    @Patch(':journalId')
    async update(
      @Param('journalId', ParseIntPipe) journalId: number,
      @Body() dto: UpdateJournalDto,
    ) {
      return this.service.update(journalId, {
        contenu: dto.contenu,
        progressionMissions: dto.progressionMissions,
      });
    }
  
    /**
     * POST /journal/:journalId/submit
     *
     * Soumission définitive d’un journal.
     * Autorisé pour STAFF, DIRECTOR, ADMIN, SERVICE_MANAGER.
     */
    @Roles('STAFF', 'DIRECTOR', 'ADMIN', 'SERVICE_MANAGER')
    @Post(':journalId/submit')
    async submit(@Param('journalId', ParseIntPipe) journalId: number) {
      return this.service.submit(journalId);
    }
  
    /**
     * POST /journal/:journalId/reopen
     *
     * Réouverture d’un journal (ADMIN seulement).
     */
    @Roles('ADMIN')
    @Post(':journalId/reopen')
    async reopen(
      @Param('journalId', ParseIntPipe) journalId: number,
      @Body() dto: ReopenJournalDto,
    ) {
      return this.service.reopen(journalId);
    }
  
    /**
     * POST /journal/:journalId/attachment
     *
     * Ajout d’une pièce jointe (PDF/JPEG/PNG) pour un journal.
     * Autorisé pour STAFF, DIRECTOR, ADMIN, SERVICE_MANAGER.
     * Limité à 3 pièces par journal.
     * Taille max : 10 Mo
     */
    @Roles('STAFF', 'DIRECTOR', 'ADMIN', 'SERVICE_MANAGER')
    @UseInterceptors(
      FileInterceptor('file', {
        storage: diskStorage({
          // Ici, on écrit physiquement le fichier dans <racine_projet>/uploads/
          destination: join(process.cwd(), 'uploads'),
          filename: (_req, file, callback) => {
            // Conserve l'extension, mais ajoute un préfixe unique
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
            const ext = extname(file.originalname);
            callback(null, `${uniqueSuffix}${ext}`);
          },
        }),
        fileFilter: (_req, file, callback) => {
          // On n’autorise que PDF/JPEG/PNG/JPG
          if (!file.mimetype.match(/\/(pdf|jpeg|png|jpg)$/)) {
            return callback(new Error('Type de fichier non autorisé'), false);
          }
          callback(null, true);
        },
        limits: {
          fileSize: 10 * 1024 * 1024, // 10 Mo
        },
      }),
    )
    @Post(':journalId/attachment')
    async uploadAttachment(
      @Param('journalId', ParseIntPipe) journalId: number,
      @UploadedFile() file: Express.Multer.File,
    ) {
      // 1) Vérifier que le journal existe (sécurité déjà gérée en guards)
      const journalExists = await this.service.findOneById(journalId);
      if (!journalExists) {
        throw new NotFoundException(`Journal ${journalId} introuvable.`);
      }
  
      // 2) Compter le nombre d’attachements existants pour ce journal
      const existingCount = await this.service.countAttachments(journalId);
      if (existingCount >= 3) {
        throw new BadRequestException(
          'Vous avez déjà 3 pièces jointes pour ce journal (maximum autorisé).',
        );
      }
  
      // 3) En base, on enregistre :
      //    - file.filename  (nom unique sur le disque)
      //    - file.originalname (nom d’origine pour l’affichage)
      return this.service.addAttachment(
        journalId,
        file.filename,        // nom physique stocké
        file.originalname,    // nom affiché au parent
      );
    }
  
    /**
     * DELETE /journal/attachment/:attachmentId
     *
     * Suppression d’une pièce jointe.
     * Autorisé pour STAFF, DIRECTOR, ADMIN, SERVICE_MANAGER.
     */
    @Roles('STAFF', 'DIRECTOR', 'ADMIN', 'SERVICE_MANAGER')
    @Delete('attachment/:attachmentId')
    async deleteAttachment(
      @Param('attachmentId', ParseIntPipe) attachmentId: number,
    ) {
      return this.service.removeAttachment(attachmentId);
    }
  }
  