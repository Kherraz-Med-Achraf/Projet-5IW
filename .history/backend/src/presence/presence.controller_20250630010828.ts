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

@ApiTags('Presence')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('presences')
export class PresenceController {
  constructor(private readonly service: PresenceService) {}

  /**
   * 1. Creer ou recuperer la feuille du jour (STAFF)
   */
  @Post()
  @Roles(Role.STAFF)
  @ApiOperation({ summary: 'Creer ou recuperer la feuille de presence pour une date' })
  async createSheet(
    @Body() dto: CreatePresenceSheetDto,
    @Req() req: Request & { user: { id: string } },
  ) {
    const sheet = await this.service.createSheet(dto.date, req.user.id);
    return this._mapParentPhones(sheet);
  }

  /**
   * 2. Validation de la feuille (STAFF) avec la liste des enfants presents
   */
  @Post(':id/validate')
  @Roles(Role.STAFF)
  @ApiOperation({ summary: 'Valider la feuille de presence' })
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
  @ApiParam({ name: 'recordId', description: 'ID de enregistrement de presence', type: Number })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: Object.values(JustificationType),
          description: 'ABSENCE ou LATENESS',
        },
        justificationDate: {
          type: 'string',
          format: 'date',
          description: 'Date du justificatif',
        },
        motif: {
          type: 'string',
          description: 'Motif de absence ou du retard',
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
   * 4. Recuperer la feuille + enregistrements pour une date donnee
   */
  @Get()
  @Roles(Role.STAFF, Role.SECRETARY, Role.DIRECTOR, Role.SERVICE_MANAGER)
  @ApiOperation({ summary: 'Recuperer la feuille de presence par date' })
  @ApiQuery({ name: 'date', description: 'Date (YYYY-MM-DD)', required: true })
  async findByDate(@Query('date') date: string) {
    const sheet = await this.service.findByDate(date);
    return this._mapParentPhones(sheet);
  }

  /**
   * 5. Telecharger un fichier de justification (SECRETARY)
   */
  @Get('justifications/:filename')
  @Roles(Role.SECRETARY, Role.DIRECTOR, Role.SERVICE_MANAGER)
  @ApiOperation({ summary: 'Telecharger un fichier de justification' })
  @ApiParam({ name: 'filename', description: 'Nom du fichier de justification' })
  async downloadJustification(
    @Param('filename') filename: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    // Securite : empecher la traversee de repertoires
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      throw new ForbiddenException('Nom de fichier invalide');
    }

    const filePath = join(process.cwd(), 'uploads', 'justifications', filename);
    
    if (!existsSync(filePath)) {
      throw new NotFoundException('Fichier de justification introuvable');
    }

    const file = createReadStream(filePath);
    
    // Definir les headers appropries
    res.set({
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${filename}"`,
    });

    return new StreamableFile(file);
  }

  /**
   * Transforme chaque record pour exposer child.parent.phone (deja charge par les requetes Prisma)
   */
  private _mapParentPhones(sheet: any) {
    // Les donnees parent.phone sont deja chargees par les requetes Prisma
    // Cette methode est maintenant juste un pass-through pour compatibilite
    return sheet;
  }
}
