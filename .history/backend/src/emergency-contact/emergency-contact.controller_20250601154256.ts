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

  /** Liste tous les contacts pour un parent (parent ou secrétaire) */
  @Get()
  @Roles(Role.PARENT, Role.SECRETARY)
  async list(
    @User() user: { id: string; role: Role },
    @Param('parentId', ParseIntPipe) parentId: number,
  ) {
    if (user.role === Role.PARENT) {
      await this.svc.verifyParentOwnership(parentId, user.id);
    }
    return this.svc.findAllForParent(parentId);
  }

  /** Récupère un contact spécifique */
  @Get(':id')
  @Roles(Role.PARENT, Role.SECRETARY)
  async getOne(
    @User() user: { id: string; role: Role },
    @Param('parentId', ParseIntPipe) parentId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    if (user.role === Role.PARENT) {
      await this.svc.verifyParentOwnership(parentId, user.id);
    }
    return this.svc.findOneForParent(parentId, id);
  }

  /** Crée un contact d’urgence (parent uniquement) */
  @Post()
  @Roles(Role.PARENT)
  async create(
    @User() user: { id: string },
    @Param('parentId', ParseIntPipe) parentId: number,
    @Body() dto: CreateEmergencyContactDto,
  ) {
    await this.svc.verifyParentOwnership(parentId, user.id);
    return this.svc.createForParent(parentId, dto);
  }

  /** Met à jour un contact d’urgence (parent uniquement) */
  @Patch(':id')
  @Roles(Role.PARENT)
  async update(
    @User() user: { id: string },
    @Param('parentId', ParseIntPipe) parentId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEmergencyContactDto,
  ) {
    await this.svc.verifyParentOwnership(parentId, user.id);
    return this.svc.updateForParent(parentId, id, dto);
  }

  /** Supprime un contact d’urgence (parent uniquement) */
  @Delete(':id')
  @Roles(Role.PARENT)
  async remove(
    @User() user: { id: string },
    @Param('parentId', ParseIntPipe) parentId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.svc.verifyParentOwnership(parentId, user.id);
    return this.svc.removeForParent(parentId, id);
  }
}
