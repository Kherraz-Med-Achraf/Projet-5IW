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
  } from '@nestjs/common';
  import { JournalService } from './journal.service';
  import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
  import { RolesGuard } from '../common/guards/roles.guard';
  import { Roles } from '../common/decorators/roles.decorator';
  import { FileInterceptor } from '@nestjs/platform-express';
  import { diskStorage } from 'multer';
  import { extname } from 'path';
  import { Express } from 'express'; // ← import nécessaire pour Express.Multer.File
  
  /**
   * Ces DTO décrivent uniquement les champs que l’on s’attend à recevoir
   * (pas forcément tous les champs Prisma).
   */
  class CreateJournalDto {
    childId: number;
    academicYearId: number;
    month: number;
    contenu?: string;
    progressionMissions?: Record<string, any>;
  }
  
  class UpdateJournalDto {
    contenu: string;
    progressionMissions: Record<string, any>;
  }
  
  class ReopenJournalDto {
    reason: string;
  }
  
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Controller('journal')
  export class JournalController {
    constructor(private readonly service: JournalService) {}
  
    /**
     * GET /journal/child/:childId?yearId=123
     */
    @Roles('STAFF', 'DIRECTOR', 'ADMIN', 'TEACHER', 'SERVICE_MANAGER', 'SECRETARY', 'PARENT')
    @Get('child/:childId')
    async findByChildAndYear(
      @Param('childId', ParseIntPipe) childId: number,
      @Query('yearId', ParseIntPipe) academicYearId: number,
    ) {
      return this.service.findByChildAndYear(childId, academicYearId);
    }
  
    /**
     * POST /journal  → créer un brouillon
     */
    @Roles('STAFF', 'DIRECTOR', 'ADMIN', 'TEACHER', 'SERVICE_MANAGER')
    @Post()
    async create(@Body() dto: CreateJournalDto) {
      return this.service.create({
        child: { connect: { id: dto.childId } },
        educator: { connect: { id: dto['educatorId'] ?? '' } }, // si besoin, connect avec educatorId
        academicYear: { connect: { id: dto.academicYearId } },
        month: dto.month,
        contenu: dto.contenu || '',
        progressionMissions: dto.progressionMissions || {},
        isDraft: true,
        isSubmitted: false,
      });
    }
  
    /**
     * PATCH /journal/:journalId  → mettre à jour un brouillon
     */
    @Roles('STAFF', 'DIRECTOR', 'ADMIN', 'TEACHER', 'SERVICE_MANAGER')
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
     * POST /journal/:journalId/submit  → soumettre définitivement
     */
    @Roles('STAFF', 'DIRECTOR', 'ADMIN', 'TEACHER', 'SERVICE_MANAGER')
    @Post(':journalId/submit')
    async submit(@Param('journalId', ParseIntPipe) journalId: number) {
      return this.service.submit(journalId);
    }
  
    /**
     * POST /journal/:journalId/reopen  → rouvrir un journal (ADMIN seulement)
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
     * POST /journal/:journalId/attachment  → uploader une pièce jointe
     */
    @Roles('STAFF', 'DIRECTOR', 'ADMIN', 'TEACHER', 'SERVICE_MANAGER')
    @UseInterceptors(
      FileInterceptor('file', {
        storage: diskStorage({
          destination: './uploads', // dossier à adapter si besoin
          filename: (_req, file, callback) => {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
            const ext = extname(file.originalname);
            callback(null, `${uniqueSuffix}${ext}`);
          },
        }),
        fileFilter: (_req, file, callback) => {
          // N’autoriser que PDF/JPEG/PNG
          if (!file.mimetype.match(/\/(pdf|jpeg|png|jpg)$/)) {
            return callback(new Error('Type de fichier non autorisé'), false);
          }
          callback(null, true);
        },
      }),
    )
    @Post(':journalId/attachment')
    async uploadAttachment(
      @Param('journalId', ParseIntPipe) journalId: number,
      @UploadedFile() file: Express.Multer.File,
    ) {
      return this.service.addAttachment(journalId, file.filename, file.path);
    }
  
    /**
     * DELETE /journal/attachment/:attachmentId  → supprimer une pièce jointe
     */
    @Roles('STAFF', 'DIRECTOR', 'ADMIN', 'TEACHER', 'SERVICE_MANAGER')
    @Delete('attachment/:attachmentId')
    async deleteAttachment(@Param('attachmentId', ParseIntPipe) attachmentId: number) {
      return this.service.removeAttachment(attachmentId);
    }
  }
  