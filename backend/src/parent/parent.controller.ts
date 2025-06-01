// src/parent/parent.controller.ts
import {
  Controller,
  UseGuards,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  ParseIntPipe,
  ForbiddenException,
} from '@nestjs/common';
import { ParentService } from './parent.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { User } from '../common/decorators/user.decorator';
import { Role } from '@prisma/client';
import { UpdateParentDto } from './dto/update-parent.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('parents')
export class ParentController {
  constructor(private readonly svc: ParentService) {}

  /** 1) Liste tous les parents */
  @Get()
  @Roles(Role.SECRETARY, Role.ADMIN, Role.DIRECTOR, Role.SERVICE_MANAGER)
  async findAll() {
    return this.svc.findAll();
  }

  /** 2) Récupère un profil parent par ID */
  @Get(':id')
  @Roles(Role.SECRETARY, Role.ADMIN, Role.DIRECTOR, Role.SERVICE_MANAGER, Role.PARENT)
  async findOne(
    @User() user: { id: string; role: Role },
    @Param('id', ParseIntPipe) id: number,
  ) {
    const profile = await this.svc.findOne(id);
    if (
      user.role === Role.PARENT &&
      profile.userId !== user.id
    ) {
      throw new ForbiddenException("Accès refusé à ce profil parent");
    }
    return profile;
  }

  /** 3) Met à jour un profil parent */
  @Patch(':id')
  @Roles(Role.SECRETARY, Role.ADMIN, Role.DIRECTOR, Role.SERVICE_MANAGER, Role.PARENT)
  async update(
    @User() user: { id: string; role: Role },
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateParentDto,
  ) {
    const profile = await this.svc.findOne(id);
    if (
      user.role === Role.PARENT &&
      profile.userId !== user.id
    ) {
      throw new ForbiddenException("Accès refusé à ce profil parent");
    }
    return this.svc.update(id, dto);
  }

  /** 4) Supprime un profil parent */
  @Delete(':id')
  @Roles(Role.SECRETARY, Role.ADMIN, Role.DIRECTOR, Role.SERVICE_MANAGER, Role.PARENT)
  async remove(
    @User() user: { id: string; role: Role },
    @Param('id', ParseIntPipe) id: number,
  ) {
    const profile = await this.svc.findOne(id);
    if (
      user.role === Role.PARENT &&
      profile.userId !== user.id
    ) {
      throw new ForbiddenException("Accès refusé à ce profil parent");
    }
    return this.svc.remove(id);
  }
}
