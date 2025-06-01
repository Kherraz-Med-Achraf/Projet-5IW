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
  import { SecretaryService } from './secretary.service';
  import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
  import { RolesGuard } from '../common/guards/roles.guard';
  import { Roles } from '../common/decorators/roles.decorator';
  import { Role } from '@prisma/client';
  import { CreateSecretaryDto } from './dto/create-secretary.dto';
  import { UpdateSecretaryDto } from './dto/update-secretary.dto';
  
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Controller('secretaries')
  export class SecretaryController {
    constructor(private readonly svc: SecretaryService) {}

    @Post()
    @Roles(Role.ADMIN)
    async create(@Body() dto: CreateSecretaryDto) {
      return this.svc.create(dto);
    }
  
    @Get()
    @Roles(Role.ADMIN, Role.SECRETARY)
    async findAll() {
      return this.svc.findAll();
    }
  
    @Get(':id')
    @Roles(Role.ADMIN, Role.SECRETARY)
    async findOne(@Param('id', ParseIntPipe) id: number) {
      return this.svc.findOne(id);
    }
  
    /** Admin et Secrétaires peuvent modifier */
    @Patch(':id')
    @Roles(Role.ADMIN, Role.SECRETARY)
    async update(
      @Param('id', ParseIntPipe) id: number,
      @Body() dto: UpdateSecretaryDto,
    ) {
      return this.svc.update(id, dto);
    }
  
    /** Admin et Secrétaires peuvent supprimer */
    @Delete(':id')
    @Roles(Role.ADMIN, Role.SECRETARY)
    async remove(@Param('id', ParseIntPipe) id: number) {
      return this.svc.remove(id);
    }
  }
  