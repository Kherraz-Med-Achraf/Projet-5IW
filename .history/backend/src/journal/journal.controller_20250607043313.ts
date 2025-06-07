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
  
    @Roles('STAFF', 'DIRECTOR', 'ADMIN', 'SERVICE_MANAGER', 'PARENT')
    @Get('child/:childId')
    async findByChildAndYear(
      @User() user: { id: string; role: string },
      @Param('childId', ParseIntPipe) childId: number,
      @Query('yearId', ParseIntPipe) academicYearId: number,
    ) {
      if (user.role === 'PARENT') {
        const ok = await this.service.verifyChildBelongsToParent(childId, user.id);
        if (!ok) {
          throw new ForbiddenException('Vous n’êtes pas autorisé·e à consulter ce journal.');
        }
      }
      return this.service.findByChildAndYear(childId, academicYearId);
    }
  
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
  
    @Roles('STAFF', 'DIRECTOR', 'ADMIN', 'SERVICE_MANAGER')
    @Post(':journalId/submit')
    async submit(@Param('journalId', ParseIntPipe) journalId: number) {
      return this.service.submit(journalId);
    }
  
    @Roles('ADMIN')
    @Post(':journalId/reopen')
    async reopen(
      @Param('journalId', ParseIntPipe) journalId: number,
      @Body() dto: ReopenJournalDto,
    ) {
      return this.service.reopen(journalId);
    }
  
    @Roles('STAFF', 'DIRECTOR', 'ADMIN', 'SERVICE_MANAGER')
    @UseInterceptors(
      FileInterceptor('file', {
        storage: diskStorage({
          destination: join(process.cwd(), 'uploads'),
          filename: (_req, file, cb) => {
            const suffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
            cb(null, `${suffix}${extname(file.originalname)}`);
          },
        }),
        fileFilter: (_req, file, cb) => {
          if (!file.mimetype.match(/\/(pdf|jpeg|png|jpg)$/)) {
            return cb(new BadRequestException('Type de fichier non autorisé'), false);
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
      const j = await this.service.findOneById(journalId);
      if (!j) throw new NotFoundException(`Journal ${journalId} introuvable.`);
      const count = await this.service.countAttachments(journalId);
      if (count >= 3) {
        throw new BadRequestException('Maximum 3 pièces jointes autorisées.');
      }
      return this.service.addAttachment(journalId, file.filename, file.originalname);
    }
  
    @Roles('STAFF', 'DIRECTOR', 'ADMIN', 'SERVICE_MANAGER')
    @Delete('attachment/:attachmentId')
    async deleteAttachment(@Param('attachmentId', ParseIntPipe) attachmentId: number) {
      return this.service.removeAttachment(attachmentId);
    }
  
    @Roles('STAFF', 'DIRECTOR', 'ADMIN', 'SERVICE_MANAGER')
    @Get()
    async findByMonth(@Query('month') month: string) {
      return this.service.findByMonth(month);
    }
  }
  