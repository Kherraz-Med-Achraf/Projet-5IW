// src/journal/journal.controller.ts
import {
    Controller,
    Get,
    Param,
    Query,            // ← ajouté
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
    UnsupportedMediaTypeException,
  } from '@nestjs/common';
  import { FileInterceptor } from '@nestjs/platform-express';
  import { diskStorage } from 'multer';
  import { extname, join } from 'path';
  import { Express } from 'express';
  import { v4 as uuidv4 } from 'uuid';
  
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
     * Nettoie et génère un nom de fichier sécurisé pour le stockage
     */
    private generateSafeFilename(originalname: string): { diskFilename: string; displayName: string } {
      // Nettoie le nom d'affichage (garde quelques caractères spéciaux pour l'utilisateur)
      const displayName = originalname
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Supprime les accents
        .replace(/[<>:"/\\|?*\x00-\x1f]/g, '') // Supprime les caractères dangereux
        .replace(/\s+/g, '_') // Remplace les espaces par underscores
        .replace(/_+/g, '_') // Supprime les underscores multiples
        .replace(/^_|_$/g, '') // Supprime les underscores en début/fin
        .trim();

      // Génère un nom de fichier unique pour le disque
      const extension = extname(originalname).toLowerCase();
      const uuid = uuidv4().substring(0, 8); // 8 premiers caractères de l'UUID
      const timestamp = Date.now();
      const diskFilename = `${timestamp}_${uuid}${extension}`;

      return {
        diskFilename,
        displayName: displayName || `document${extension}` // Fallback si le nom est vide
      };
    }
  
    /* ───── Journaux d'un enfant pour une année ───── */
    @Roles('STAFF', 'DIRECTOR', 'ADMIN', 'SERVICE_MANAGER', 'PARENT')
    @Get('child/:childId')
    async findByChildAndYear(
      @User() user: { id: string; role: string },
      @Param('childId', ParseIntPipe) childId: number,
      @Query('yearId', ParseIntPipe) academicYearId: number,
    ) {
      if (user.role === 'PARENT') {
        const ok = await this.service.verifyChildBelongsToParent(childId, user.id);
        if (!ok) throw new ForbiddenException('Vous n\'êtes pas autorisé·e à consulter ce journal.');
      }

      if (user.role === 'CHILD') {
        throw new ForbiddenException('Accès interdit : les enfants ne peuvent pas consulter les journaux.');
      }

      return this.service.findByChildAndYear(childId, academicYearId);
    }
  
    /* ───── GET /journal?month=YYYY-MM ───── */
    @Roles('STAFF', 'DIRECTOR', 'ADMIN', 'SERVICE_MANAGER')
    @Get()
    async findByMonth(@Query('month') month: string) {
      return this.service.findByMonth(month);
    }
  
    /* ───── Création d'un brouillon ───── */
    @Roles('STAFF', 'ADMIN')
    @Post()
    async create(
      @Body() dto: CreateJournalDto,
      @User() user: { id: string; role: string },
    ) {
      return this.service.create({
        child:          { connect: { id: dto.childId } },
        educator:       { connect: { id: user.id } },
        academicYear:   { connect: { id: dto.academicYearId } },
        month:          dto.month,
        contenu:        dto.contenu ?? '',
        progressionMissions: dto.progressionMissions ?? {},
        isDraft:        true,
        isSubmitted:    false,
      });
    }
  
    /* ───── Mise à jour d'un brouillon ───── */
    @Roles('STAFF', 'ADMIN')
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
  
    /* ───── Soumission définitive ───── */
    @Roles('STAFF', 'DIRECTOR', 'ADMIN', 'SERVICE_MANAGER')
    @Post(':journalId/submit')
    async submit(@Param('journalId', ParseIntPipe) journalId: number) {
      return this.service.submit(journalId);
    }
  
    /* ───── Réouverture par ADMIN ───── */
    @Roles('ADMIN')
    @Post(':journalId/reopen')
    async reopen(
      @Param('journalId', ParseIntPipe) journalId: number,
      @Body() _dto: ReopenJournalDto,
    ) {
      return this.service.reopen(journalId);
    }
  
    /* ───── Ajout de pièce jointe ───── */
    @Roles('STAFF', 'DIRECTOR', 'ADMIN', 'SERVICE_MANAGER')
    @UseInterceptors(
      FileInterceptor('file', {
        storage: diskStorage({
          destination: join(process.cwd(), 'uploads'),
          filename: (_req, file, cb) => {
            // Génère un nom de fichier unique et sécurisé
            const extension = extname(file.originalname).toLowerCase();
            const uuid = uuidv4().substring(0, 8);
            const timestamp = Date.now();
            const diskFilename = `${timestamp}_${uuid}${extension}`;
            
            cb(null, diskFilename);
          },
        }),
        fileFilter: (_req, file, cb) => {
          // Vérification des types MIME autorisés
          const allowedMimeTypes = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'image/jpeg',
            'image/jpg',
            'image/png'
          ];
          
          if (!allowedMimeTypes.includes(file.mimetype)) {
            return cb(new UnsupportedMediaTypeException(
              `Type de fichier "${file.mimetype}" non autorisé. Formats acceptés : PDF, DOC, DOCX, JPG, PNG`
            ), false);
          }
          
          // Vérification de l'extension de fichier pour double sécurité
          const allowedExtensions = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'];
          const fileExtension = extname(file.originalname).toLowerCase();
          
          if (!allowedExtensions.includes(fileExtension)) {
            return cb(new UnsupportedMediaTypeException(
              `Extension "${fileExtension}" non autorisée. Extensions acceptées : ${allowedExtensions.join(', ')}`
            ), false);
          }
          
          cb(null, true);
        },
        limits: { fileSize: 10 * 1024 * 1024 },
      }),
    )
    @Post(':journalId/attachment')
    async uploadAttachment(
      @Param('journalId', ParseIntPipe) journalId: number,
      @UploadedFile() file: Express.Multer.File,
    ) {
      try {
        if (!file) {
          throw new BadRequestException('Aucun fichier fourni.');
        }

        const journal = await this.service.findOneById(journalId);
        if (!journal) throw new NotFoundException(`Journal ${journalId} introuvable.`);
        
        if (await this.service.countAttachments(journalId) >= 3) {
          throw new BadRequestException('Limite de 3 pièces jointes atteinte.');
        }
        
        // Génère un nom d'affichage propre pour l'utilisateur
        const { diskFilename, displayName } = this.generateSafeFilename(file.originalname);
        
        if (!displayName || displayName.trim() === '') {
          throw new BadRequestException('Le nom de fichier ne peut pas être traité. Veuillez renommer votre fichier avec des caractères standards.');
        }
        
        return this.service.addAttachment(journalId, file.filename, displayName);
        
      } catch (error) {
        // Si c'est déjà une exception NestJS, on la relance
        if (error instanceof NotFoundException || 
            error instanceof BadRequestException || 
            error instanceof UnsupportedMediaTypeException) {
          throw error;
        }
        
        // Sinon, on wrap dans une BadRequestException
        throw new BadRequestException(`Erreur lors de l'upload du fichier : ${error.message || 'Erreur inconnue'}`);
      }
    }
  
    /* ───── Suppression de pièce jointe ───── */
    @Roles('STAFF', 'DIRECTOR', 'ADMIN', 'SERVICE_MANAGER')
    @Delete('attachment/:attachmentId')
    async deleteAttachment(
      @Param('attachmentId', ParseIntPipe) attachmentId: number,
    ) {
      return this.service.removeAttachment(attachmentId);
    }
  }
  