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
  import { User } from '../common/decorators/user.decorator';
  import { CreateSecretaryDto } from './dto/create-secretary.dto';
  import { UpdateSecretaryDto } from './dto/update-secretary.dto';
  
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Controller('secretaries')
  export class SecretaryController {
    constructor(private readonly svc: SecretaryService) {}
  
    @Post()
    @Roles(Role.ADMIN)
    async create(
      @User() user: { id: string },
      @Body() dto: CreateSecretaryDto,
    ) {
      return this.svc.create(user.id, dto);
    }
  
    @Get()
    @Roles(Role.SECRETARY)
    async findAll() {
      return this.svc.findAll();
    }
  
    @Get(':id')
    @Roles(Role.SECRETARY)
    async findOne(@Param('id', ParseIntPipe) id: number) {
      return this.svc.findOne(id);
    }
  
    @Patch(':id')
    @Roles(Role.SECRETARY)
    async update(
      @Param('id', ParseIntPipe) id: number,
      @Body() dto: UpdateSecretaryDto,
    ) {
      return this.svc.update(id, dto);
    }
  
    @Delete(':id')
    @Roles(Role.SECRETARY)
    async remove(@Param('id', ParseIntPipe) id: number) {
      return this.svc.remove(id);
    }
  }
  