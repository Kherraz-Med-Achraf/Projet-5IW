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
  } from '@nestjs/common';
  import { ServiceManagerService } from './service-manager.service';
  import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
  import { RolesGuard } from '../common/guards/roles.guard';
  import { Roles } from '../common/decorators/roles.decorator';
  import { Role } from '@prisma/client';
  import { CreateServiceManagerDto } from './dto/create-service-manager.dto';
  import { UpdateServiceManagerDto } from './dto/update-service-manager.dto';
  
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Controller('service-managers')
  export class ServiceManagerController {
    constructor(private readonly svc: ServiceManagerService) {}
  
    /** Seul ADMIN peut créer */
    @Post()
    @Roles(Role.ADMIN)
    create(@Body() dto: CreateServiceManagerDto) {
      return this.svc.create(dto);
    }
  
    /** ADMIN et SERVICE_MANAGER peuvent lister */
    @Get()
    @Roles(Role.ADMIN, Role.SERVICE_MANAGER)
    findAll() {
      return this.svc.findAll();
    }
  
    /** ADMIN et SERVICE_MANAGER peuvent récupérer */
    @Get(':id')
    @Roles(Role.ADMIN, Role.SERVICE_MANAGER)
    findOne(@Param('id', ParseIntPipe) id: number) {
      return this.svc.findOne(id);
    }
  
    /** ADMIN et SERVICE_MANAGER peuvent modifier */
    @Patch(':id')
    @Roles(Role.ADMIN, Role.SERVICE_MANAGER)
    update(
      @Param('id', ParseIntPipe) id: number,
      @Body() dto: UpdateServiceManagerDto,
    ) {
      return this.svc.update(id, dto);
    }
  
    /** ADMIN et SERVICE_MANAGER peuvent supprimer */
    @Delete(':id')
    @Roles(Role.ADMIN, Role.SERVICE_MANAGER)
    remove(@Param('id', ParseIntPipe) id: number) {
      return this.svc.remove(id);
    }
  }
  