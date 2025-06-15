import { Controller, Post, Body, Param, ParseIntPipe, UseGuards, Get, Query, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags, ApiConsumes } from '@nestjs/swagger';
import { PresenceService } from './presence.service';
import { CreatePresenceSheetDto, ValidateSheetDto, JustifyAbsenceDto } from './dto/presence.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/

@ApiTags('Présence')
@Controller('presences')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
export class PresenceController {
  constructor(private readonly service: PresenceService) {}

  // 1. Créer ou récupérer la feuille du jour
  @Post()
  @Roles('STAFF')
  createSheet(@Body() dto: CreatePresenceSheetDto) {
    return this.service.createSheet(dto.date);
  }

  // 2. Validation de la feuille par l'éducateur (liste des IDs des enfants présents)
  @Post(':id/validate')
  @Roles('STAFF')
  validate(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { presentChildIds: number[] },
    @Body() dto: ValidateSheetDto,
    @Body('presentChildIds') presentChildIds: number[],
    @Param('id') sheetId: number,
    @Body('staffId') staffId: string,
  ) {
    return this.service.validateSheet(sheetId, presentChildIds, staffId);
  }

  // 3. Justification d'une absence
  @Patch('records/:recordId/justify')
  @Roles('SECRETARY')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  justify(
    @Param('recordId', ParseIntPipe) recordId: number,
    @Body() dto: JustifyAbsenceDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.service.justify(recordId, dto, file?.path);
  }

  // 4. Consultation par date (tous rôles autorisés)
  @Get()
  @Roles('STAFF','SECRETARY','DIRECTOR','SERVICE_MANAGER')
  findByDate(@Query('date') date: string) {
    return this.service.findByDate(date);
  }
}
