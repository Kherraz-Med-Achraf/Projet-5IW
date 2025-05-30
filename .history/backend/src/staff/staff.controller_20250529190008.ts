// src/staff/staff.controller.ts
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
} from '@nestjs/common';
import { StaffService } from './staff.service';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { User } from '../common/decorators/user.decorator';
import { Role } from '@prisma/client';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('staff')
export class StaffController {
  constructor(private readonly svc: StaffService) {}

  /** SERVICE_MANAGER, DIRECTOR et ADMIN peuvent créer un staff */
  @Post()
  @Roles(Role.SERVICE_MANAGER, Role.DIRECTOR, Role.ADMIN)
  create(@Body() dto: CreateStaffDto) {
    return this.svc.create(dto);
  }

  /** SECRETARY, SERVICE_MANAGER, DIRECTOR et ADMIN peuvent lister tous les profils staff */
  @Get()
  @Roles(Role.SECRETARY, Role.SERVICE_MANAGER, Role.DIRECTOR, Role.ADMIN)
  findAll() {
    return this.svc.findAll();
  }

  /**
   * SECRETARY, SERVICE_MANAGER, DIRECTOR, ADMIN
   * et le STAFF concerné peuvent récupérer leur profil
   */
  @Get(':id')
  @Roles(Role.SECRETARY, Role.SERVICE_MANAGER, Role.DIRECTOR, Role.ADMIN, Role.STAFF)
  async findOne(
    @User() user: { id: string; role: Role },
    @Param('id', ParseIntPipe) id: number,
  ) {
    const profile = await this.svc.findOne(id);
    if (user.role === Role.STAFF && profile.userId !== user.id) {
      throw new NotFoundException(`Profil staff introuvable`);
    }
    return profile;
  }

  /**
   * SERVICE_MANAGER, DIRECTOR, ADMIN
   * et le STAFF concerné peuvent mettre à jour leur profil
   */
  @Patch(':id')
  @Roles(Role.SERVICE_MANAGER, Role.DIRECTOR, Role.ADMIN, Role.STAFF)
  async update(
    @User() user: { id: string; role: Role },
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateStaffDto,
  ) {
    const profile = await this.svc.findOne(id);
    if (user.role === Role.STAFF && profile.userId !== user.id) {
      throw new NotFoundException(`Profil staff introuvable`);
    }
    return this.svc.update(id, dto);
  }

  /**
   * SERVICE_MANAGER, DIRECTOR et ADMIN peuvent supprimer un profil staff
   */
  @Delete(':id')
  @Roles(Role.SERVICE_MANAGER, Role.DIRECTOR, Role.ADMIN)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.svc.remove(id);
  }
}
