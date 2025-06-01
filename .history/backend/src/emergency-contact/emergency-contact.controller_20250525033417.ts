// src/emergency-contact/emergency-contact.controller.ts
import {
    Controller, Post, Get, Patch, Delete,
    Param, Body, ParseIntPipe, UseGuards, NotFoundException
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
  
    @Get()
    @Roles(Role.PARENT, Role.SECRETARY)
    list(
      @User() user: { id: string; role: Role },
      @Param('parentId', ParseIntPipe) parentId: number,
    ) {
      if (user.role === Role.PARENT && user.id !== /* lookup userId from parentProfileId */) {
        throw new NotFoundException(`Profil parent introuvable`);
      }
      return this.svc.findAllForParent(parentId);
    }
  
    @Get(':id')
    @Roles(Role.PARENT, Role.SECRETARY)
    getOne(
      @User() user: { id: string; role: Role },
      @Param('parentId', ParseIntPipe) parentId: number,
      @Param('id', ParseIntPipe) id: number,
    ) {
      return this.svc.findOneForParent(parentId, id);
    }
  
    @Post()
    @Roles(Role.PARENT)
    create(
      @User() user: { id: string },
      @Param('parentId', ParseIntPipe) parentId: number,
      @Body() dto: CreateEmergencyContactDto,
    ) {
      // idem : vérifier que user.id === parentProfile.userId
      return this.svc.createForParent(parentId, dto);
    }
  
    @Patch(':id')
    @Roles(Role.PARENT)
    update(
      @User() user: { id: string },
      @Param('parentId', ParseIntPipe) parentId: number,
      @Param('id', ParseIntPipe) id: number,
      @Body() dto: UpdateEmergencyContactDto,
    ) {
      return this.svc.updateForParent(parentId, id, dto);
    }
  
    @Delete(':id')
    @Roles(Role.PARENT)
    remove(
      @User() user: { id: string },
      @Param('parentId', ParseIntPipe) parentId: number,
      @Param('id', ParseIntPipe) id: number,
    ) {
      return this.svc.removeForParent(parentId, id);
    }
  }
  