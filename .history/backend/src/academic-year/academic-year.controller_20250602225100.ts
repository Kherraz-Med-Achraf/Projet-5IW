// src/academic-year/academic-year.controller.ts
import {
    Controller,
    Get,
    Param,
    ParseIntPipe,
    Body,
    Post,
    Patch,
    Delete,
    UseGuards,
  } from '@nestjs/common';
  import { AcademicYearService } from './academic-year.service';
  import { Public } from '../common/decorators/public.decorator';
  import { Roles } from '../common/decorators/roles.decorator';
  import { RolesGuard } from '../common/guards/roles.guard';
  import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
  
  class CreateAcademicYearDto {
    label: string;
    startDate: Date;
    endDate: Date;
  }
  
  class UpdateAcademicYearDto {
    label?: string;
    startDate?: Date;
    endDate?: Date;
  }
  
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Controller('academic-year')
  export class AcademicYearController {
    constructor(private readonly service: AcademicYearService) {}
  
    /** 
     * Cette route est “publique” (pas besoin de JWT). 
     * Le guard global JwtAuthGuard la laissera passer grâce à @Public().
     */
    @Public()
    @Get()
    findAll() {
      return this.service.findAll();
    }
  
    /** 
     * Les autres routes restent protégées :
     * - JwtAuthGuard vérifie le JWT 
     * - RolesGuard vérifie que user.role fait partie des rôles listés
     */
    @Roles('STAFF', 'PARENT', 'DIRECTOR', 'ADMIN', 'SERVICE_MANAGER', 'SECRETARY')
    @Get(':id')
    findOne(@Param('id', ParseIntPipe) id: number) {
      return this.service.findOne(id);
    }
  
    @Roles('ADMIN')
    @Post()
    create(@Body() dto: CreateAcademicYearDto) {
      return this.service.create(dto);
    }
  
    @Roles('ADMIN')
    @Patch(':id')
    update(
      @Param('id', ParseIntPipe) id: number,
      @Body() dto: UpdateAcademicYearDto,
    ) {
      return this.service.update(id, dto);
    }
  
    @Roles('ADMIN')
    @Delete(':id')
    remove(@Param('id', ParseIntPipe) id: number) {
      return this.service.remove(id);
    }
  }
  