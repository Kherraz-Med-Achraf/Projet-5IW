// src/emergency-contact/emergency-contact.controller.ts

import {
    Controller,
    Post,
    Get,
    Patch,
    Delete,
    Param,
    Body,
    ParseIntPipe,
    UseGuards,
    NotFoundException,
    ForbiddenException,
  } from '@nestjs/common';
  import { EmergencyContactService } from './emergency-contact.service';
  import { CreateEmergencyContactDto } from './dto/create-emergency-contact.dto';
  import { UpdateEmergencyContactDto } from './dto/update-emergency-contact.dto';
  import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
  import { RolesGuard } from '../common/guards/roles.guard';
  import { Roles } from '../common/decorators/roles.decorator';
  import { User } from '../common/decorators/user.decorator';
  import { Role } from '@prisma/client';
  
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Controller('parents/:parentId/emergency-contacts')
  export class EmergencyContactController {
    constructor(private readonly svc: EmergencyContactService) {}
  
    private async ensureParentAccess(
      user: { id: string; role: Role },
      parentId: number,
    ) {
      const profile = await this.svc.prisma.parentProfile.findUnique({
        where: { id: parentId },
        select: { userId: true },
      });
      if (!profile) {
        throw new NotFoundException(`Profil parent ${parentId} introuvable`);
      }
      if (user.role === Role.PARENT && profile.userId !== user.id) {
        throw new ForbiddenException(`Accès refusé à ce profil parent`);
      }
    }
  
    @Get()
    @Roles(Role.PARENT, Role.SECRETARY)
    async list(
      @User() user: { id: string; role: Role },
      @Param('parentId', ParseIntPipe) parentId: number,
    ) {
      await this.ensureParentAccess(user, parentId);
      return this.svc.findAllForParent(parentId);
    }
  
    @Get(':id')
    @Roles(Role.PARENT, Role.SECRETARY)
    async getOne(
      @User() user: { id: string; role: Role },
      @Param('parentId', ParseIntPipe) parentId: number,
      @Param('id', ParseIntPipe) id: number,
    ) {
      await this.ensureParentAccess(user, parentId);
      return this.svc.findOneForParent(parentId, id);
    }
  
    @Post()
    @Roles(Role.PARENT)
    async create(
      @User() user: { id: string; role: Role },
      @Param('parentId', ParseIntPipe) parentId: number,
      @Body() dto: CreateEmergencyContactDto,
    ) {
      await this.ensureParentAccess(user, parentId);
      return this.svc.createForParent(parentId, dto);
    }
  
    @Patch(':id')
    @Roles(Role.PARENT)
    async update(
      @User() user: { id: string; role: Role },
      @Param('parentId', ParseIntPipe) parentId: number,
      @Param('id', ParseIntPipe) id: number,
      @Body() dto: UpdateEmergencyContactDto,
    ) {
      await this.ensureParentAccess(user, parentId);
      return this.svc.updateForParent(parentId, id, dto);
    }
  
    @Delete(':id')
    @Roles(Role.PARENT)
    async remove(
      @User() user: { id: string; role: Role },
      @Param('parentId', ParseIntPipe) parentId: number,
      @Param('id', ParseIntPipe) id: number,
    ) {
      await this.ensureParentAccess(user, parentId);
      return this.svc.removeForParent(parentId, id);
    }
  }
  