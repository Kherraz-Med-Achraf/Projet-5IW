// src/service-manager/service-manager.controller.ts
import {
  Controller,
  UseGuards,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  ParseIntPipe,
  NotFoundException,
} from '@nestjs/common';
import { ServiceManagerService } from './service-manager.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CsrfGuard } from '../common/guards/csrf.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { User } from '../common/decorators/user.decorator';
import { Role } from '@prisma/client';
import { CreateServiceManagerDto } from './dto/create-service-manager.dto';
import { UpdateServiceManagerDto } from './dto/update-service-manager.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('service-managers')
export class ServiceManagerController {
  constructor(private readonly svc: ServiceManagerService) {}

  @Post()
  @Roles(Role.ADMIN)
  @UseGuards(CsrfGuard)
  create(@Body() dto: CreateServiceManagerDto) {
    return this.svc.create(dto);
  }

  @Get()
  @Roles(Role.SECRETARY, Role.SERVICE_MANAGER, Role.DIRECTOR, Role.ADMIN)
  findAll() {
    return this.svc.findAll();
  }

  @Get(':id')
  @Roles(Role.SECRETARY, Role.SERVICE_MANAGER, Role.DIRECTOR, Role.ADMIN)
  async findOne(
    @User() user: { id: string; role: Role },
    @Param('id', ParseIntPipe) id: number,
  ) {
    const profile = await this.svc.findOne(id);
    if (user.role === Role.SERVICE_MANAGER && profile.userId !== user.id) {
      throw new NotFoundException(`Profil service manager introuvable`);
    }
    return profile;
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @UseGuards(CsrfGuard)
  async update(
    @User() user: { id: string; role: Role },
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateServiceManagerDto,
  ) {
    const profile = await this.svc.findOne(id);
    return this.svc.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @UseGuards(CsrfGuard)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.svc.remove(id);
  }
}
