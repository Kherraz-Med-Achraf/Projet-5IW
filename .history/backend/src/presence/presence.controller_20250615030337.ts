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
import { Request } from 'express';

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
  createSheet(
    @Body() dto: CreatePresenceSheetDto,
    @Req() req: Request & { user: { id: string } },
  ) {
    return this.service.createSheet(dto.date, req.user.id);
  }

  /**
   * 2. Validation de la feuille (STAFF) avec la liste des enfants présents
   */
  @Post(':id/validate')
  @Roles(Role.STAFF)
  @ApiOperation({ summary: 'Valider la feuille de présence' })
  @ApiParam({ name: 'id', description: 'ID de la feuille', type: Number })
  validateSheet(
    @Param('id', ParseIntPipe) sheetId: number,
    @Body() dto: ValidateSheetDto,
    @Req() req: Request & { user: { id: string } },
  ) {
    return this.service.validateSheet(sheetId, dto.presentChildIds, req.user.id);
  }

  /**
   * 3. Justification d’une absence ou d’un retard (SECRETARY)
   */
  @Patch('records/:recordId/justify')
  @Roles(Role.SECRETARY)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Justifier une absence ou un retard' })
  @ApiParam({ name: 'recordId', description: 'ID de l’enregistrement de présence', type: Number })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        type: {
          enum: JustificationType,
          description: '“ABSENCE” ou “LATENESS”',
        },
        justificationDate: { type: 'string', format: 'date', description: 'Date du justificatif' },
        motif: { type: 'string', description: 'Motif de l’absence ou du retard' },
        file: { type: 'string', format: 'binary', description: 'Fichier justificatif (facultatif)' },
      },
      required: ['type', 'justificationDate', 'motif'],
    },
  })
  justify(
    @Param('recordId', ParseIntPipe) recordId: number,
    @Body() dto: JustifyAbsenceDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.service.justify(recordId, dto, file?.path);
  }

  /**
   * 4. Récupérer la feuille + enregistrements pour une date donnée
   */
  @Get()
  @Roles(Role.STAFF, Role.SECRETARY, Role.DIRECTOR, Role.SERVICE_MANAGER)
  @ApiOperation({ summary: 'Récupérer la feuille de présence par date' })
  @ApiQuery({ name: 'date', description: 'Date (YYYY-MM-DD)', required: true })
  findByDate(@Query('date') date: string) {
    return this.service.findByDate(date);
  }
}
