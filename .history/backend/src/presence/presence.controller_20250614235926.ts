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
  import { ApiBearerAuth, ApiTags, ApiConsumes } from '@nestjs/swagger';
  import { PresenceService } from './presence.service';
  import {
    CreatePresenceSheetDto,
    ValidateSheetDto,
    JustifyAbsenceDto,
  } from './dto/presence.dto';
  import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
  import { RolesGuard } from '../common/guards/roles.guard';
  import { Roles } from '../common/decorators/roles.decorator';
  import { Role } from '@prisma/client';
  import { Request } from 'express';
  
  @ApiTags('Présence')
  @Controller('presences')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  export class PresenceController {
    constructor(private readonly service: PresenceService) {}
  
    // 1. Créer ou récupérer la feuille du jour (éducateur)
    @Post()
    @Roles(Role.STAFF)
    createSheet(
      @Body() dto: CreatePresenceSheetDto,
      @Req() req: Request & { user: { id: string } },
    ) {
      const staffId = req.user.id;
      return this.service.createSheet(dto.date, staffId);
    }
  
    // 2. Validation de la feuille (éducateur) avec liste des IDs présents
    @Post(':id/validate')
    @Roles(Role.STAFF)
    validateSheet(
      @Param('id', ParseIntPipe) sheetId: number,
      @Body() dto: ValidateSheetDto,
      @Req() req: Request & { user: { id: string } },
    ) {
      const staffId = req.user.id;
      return this.service.validateSheet(
        sheetId,
        dto.presentChildIds,
        staffId,
      );
    }
  
    // 3. Justification d'une absence (secrétaire)
    @Patch('records/:recordId/justify')
    @Roles(Role.SECRETARY)
    @UseInterceptors(FileInterceptor('file'))
    @ApiConsumes('multipart/form-data')
    justify(
      @Param('recordId', ParseIntPipe) recordId: number,
      @Body() dto: JustifyAbsenceDto,
      @UploadedFile() file?: Express.Multer.File,
    ) {
      return this.service.justify(recordId, dto, file?.path);
    }
  
    // 4. Consultation par date (lecture staff, secrétaire, direction, service)
    @Get()
    @Roles(Role.STAFF, Role.SECRETARY, Role.DIRECTOR, Role.SERVICE_MANAGER)
    findByDate(@Query('date') date: string) {
      return this.service.findByDate(date);
    }
  }
  