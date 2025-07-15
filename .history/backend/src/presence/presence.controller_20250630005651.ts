// src/presence/presence.controller.ts

import {
  Controller,
  Post,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  Get,
  Query,
  UploadedFile,
  UseInterceptors,
  Patch,
  Req,
  StreamableFile,
  NotFoundException,
  ForbiddenException,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiTags,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { PresenceService } from './presence.service';
import {
  CreatePresenceSheetDto,
  ValidateSheetDto,
  JustifyAbsenceDto,
  JustificationType,
} from './dto/presence.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { Request, Response } from 'express';
import { createReadStream, existsSync } from 'fs';
import { join } from 'path';

@ApiTags('Présence')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('presences')
export class PresenceController {
  constructor(private readonly service: PresenceService) {}

  /**
   * 1. Créer ou récupérer la feuille du jour (STAFF)
   */
  @Post()
  @Roles(Role.STAFF)
  @ApiOperation({ summary: 'Créer ou récupérer la feuille de présence pour une date' })
  async createSheet(
    @Body() dto: CreatePresenceSheetDto,
    @Req() req: Request & { user: { id: string } },
  ) {
    const sheet = await this.service.createSheet(dto.date, req.user.id);
    return this._mapParentPhones(sheet);
  }

  /**
   * 2. Validation de la feuille (STAFF) avec la liste des enfants présents
   */
  @Post(':id/validate')
  @Roles(Role.STAFF)
  @ApiOperation({ summary: 'Valider la feuille de présence' })
  @ApiParam({ name: 'id', description: 'ID de la feuille', type: Number })
  async validateSheet(
    @Param('id', ParseIntPipe) sheetId: number,
    @Body() dto: ValidateSheetDto,
    @Req() req: Request & { user: { id: string } },
  ) {
    const sheet = await this.service.validateSheet(sheetId, dto.presentChildIds, req.user.id);
    return this._mapParentPhones(sheet);
  }

  /**
   * 3. Justification d'une absence ou d'un retard (SECRETARY)
   */
  @Patch('records/:recordId/justify')
  @Roles(Role.SECRETARY)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Justifier une absence ou un retard' })
  @ApiParam({ name: 'recordId', description: 'ID de l'enregistrement de présence', type: Number })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: Object.values(JustificationType),
          description: ""ABSENCE" ou "LATENESS"',
        },
        justificationDate: {
          type: 'string',
          format: 'date',
          description: 'Date du justificatif',
        },
        motif: {
          type: 'string',
          description: 'Motif de l'absence ou du retard',
        },
        file: {
          type: 'string',
          format: 'binary',
          description: 'Fichier justificatif (facultatif)',
        },
      },
      required: ['type', 'justificationDate'],
    },
  })
  async justify(
    @Param('recordId', ParseIntPipe) recordId: number,
    @Body() dto: JustifyAbsenceDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const sheet = await this.service.justify(recordId, dto, file?.path);
    return this._mapParentPhones(sheet);
  }

  /**
   * 4. Récupérer la feuille + enregistrements pour une date donnée
   */
  @Get()
  @Roles(Role.STAFF, Role.SECRETARY, Role.DIRECTOR, Role.SERVICE_MANAGER)
  @ApiOperation({ summary: 'Récupérer la feuille de présence par date' })
  @ApiQuery({ name: 'date', description: 'Date (YYYY-MM-DD)', required: true })
  async findByDate(@Query('date') date: string) {
    const sheet = await this.service.findByDate(date);
    return this._mapParentPhones(sheet);
  }

  /**
   * 4. Télécharger un fichier de justification (SECRETARY)
   */
  @Get('justifications/:filename')
  @Roles(Role.SECRETARY, Role.DIRECTOR, Role.SERVICE_MANAGER)
  @ApiOperation({ summary: 'Télécharger un fichier de justification' })
  @ApiParam({ name: 'filename', description: 'Nom du fichier de justification' })
  async downloadJustification(
    @Param('filename') filename: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    // Sécurité : empêcher la traversée de répertoires
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      throw new ForbiddenException('Nom de fichier invalide');
    }

    const filePath = join(process.cwd(), 'uploads', 'justifications', filename);
    
    if (!existsSync(filePath)) {
      throw new NotFoundException('Fichier de justification introuvable');
    }

    const file = createReadStream(filePath);
    
    // Définir les headers appropriés
    res.set({
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${filename}"`,
    });

    return new StreamableFile(file);
  }

  /**
   * Transforme chaque record pour exposer `child.parent.phone` (déjà chargé par les requêtes Prisma)
   */
  private _mapParentPhones(sheet: any) {
    // Les données parent.phone sont déjà chargées par les requêtes Prisma
    // Cette méthode est maintenant juste un pass-through pour compatibilité
    return sheet;
  }
}
