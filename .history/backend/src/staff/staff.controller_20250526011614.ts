// src/staff/staff.controller.ts
import {
    Controller, Post, Get, Patch, Delete,
    Param, Body, ParseIntPipe, UseGuards
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
  
    @Post()
    @Roles(Role.ADMIN)
    create(@Body() dto: CreateStaffDto) {
      return this.svc.create(dto);
    }
  
    @Get()
    @Roles(Role.ADMIN, Role.SECRETARY)
    findAll() {
      return this.svc.findAll();
    }
  
    @Get(':id')
    @Roles(Role.ADMIN, Role.STAFF)
    findOne(
      @User() user: { id: string; role: Role },
      @Param('id', ParseIntPipe) id: number,
    ) {
      if (user.role === Role.STAFF && user.id !== /* lookup staffProfile.userId */) {
        throw new NotFoundException(`Profil staff introuvable`);
      }
      return this.svc.findOne(id);
    }
  
    @Patch(':id')
    @Roles(Role.ADMIN, Role.STAFF)
    update(
      @User() user: { id: string; role: Role },
      @Param('id', ParseIntPipe) id: number,
      @Body() dto: UpdateStaffDto,
    ) {
      if (user.role === Role.STAFF && user.id !== /* userId from profile */) {
        throw new NotFoundException(`Profil staff introuvable`);
      }
      return this.svc.update(id, dto);
    }
  
    @Delete(':id')
    @Roles(Role.ADMIN)
    remove(@Param('id', ParseIntPipe) id: number) {
      return this.svc.remove(id);
    }
  }
  