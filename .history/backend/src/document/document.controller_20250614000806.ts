import {
    Controller, Post, UseGuards, UploadedFile, Body, Get, Query,
    Param, Patch, Req, UseInterceptors
  } from '@nestjs/common';
  import { FileInterceptor } from '@nestjs/platform-express';
  import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
  import { Roles } from '../common/decorators/
  import { Role } from '@prisma/client';
  import { DocumentService } from './document.service';
  import { CreateConsentDto } from './dto/create-consent.dto';
  import { ListConsentsDto } from './dto/list-consents.dto';
  
  @Controller('documents')
  @UseGuards(JwtAuthGuard)
  export class DocumentController {
    constructor(private readonly service: DocumentService) {}
  
    /* ============ SECRÉTAIRE ============ */
  
    @Post('consents')
    @Roles(Role.SECRETARY)
    @UseInterceptors(FileInterceptor('file'))
    async uploadConsent(
      @UploadedFile() file: Express.Multer.File,
      @Body('data') raw: string,
      @Req() req,
    ) {
      const dto: CreateConsentDto = JSON.parse(raw);
      return this.service.createConsent(dto, file, req.user.id);
    }
  
    @Get('consents/secretary')
    @Roles(Role.SECRETARY)
    listSecretary(@Req() req, @Query() query: ListConsentsDto) {
      return this.service.listForSecretary(req.user.id, query);
    }
  
    /* ============ PARENT ============ */
  
    @Get('consents/parent')
    @Roles(Role.PARENT)
    listParent(@Req() req, @Query() query: ListConsentsDto) {
      return this.service.listForParent(req.user.id, query);
    }
  
    /* ============ SIGNATURE ============ */
  
    @Get('consents/:id/sign-url')
    async getSignUrl(@Param('id') id: string, @Req() req) {
      return this.service.getSignUrl(id, req.user.id);
    }
  }
  