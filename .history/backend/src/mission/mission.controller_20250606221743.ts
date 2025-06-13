// src/mission/mission.controller.ts
import {
    Controller,
    Get,
    Param,
    ParseIntPipe,
    UseGuards,
    Post,
    Delete,
    Body,
    NotFoundException,
  } from '@nestjs/common';
  import { MissionService } from './mission.service';
  import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
  import { RolesGuard } from '../common/guards/roles.guard';
  import { Roles } from '../common/decorators/roles.decorator';
  import { CreateMissionDto } from './dto/create-mission.dto';
  
  @Controller('mission')
  @UseGuards(JwtAuthGuard, RolesGuard)
  export class MissionController {
    constructor(private readonly service: MissionService) {}
  
    /**
     * GET /mission/child/:childId/year/:yearId
     * Récupère toutes les missions d’un enfant pour une année donnée.
     */
    @Roles('STAFF', 'DIRECTOR', 'ADMIN', 'TEACHER', 'SERVICE_MANAGER', 'SECRETARY')
    @Get('child/:childId/year/:yearId')
    async findByChildAndYear(
      @Param('childId', ParseIntPipe) childId: number,
      @Param('yearId', ParseIntPipe) academicYearId: number,
    ) {
      return this.service.findByChildAndYear(childId, academicYearId);
    }
  
    /**
     * POST /mission
     * Crée une nouvelle mission pour un enfant et une année donnée.
     * Seuls STAFF et ADMIN peuvent créer.
     */
    @Roles('STAFF', 'ADMIN')
    @Post()
    async create(@Body() dto: CreateMissionDto) {
      return this.service.create(dto);
    }
  
    /**
     * DELETE /mission/:id
     * Supprime une mission existante par son ID.
     * Seuls STAFF et ADMIN peuvent supprimer.
     */
    @Roles('STAFF', 'ADMIN')
    @Delete(':id')
    async remove(@Param('id', ParseIntPipe) id: number) {
      const deleted = await this.service.remove(id);
      if (!deleted) {
        throw new NotFoundException(`Mission ${id} introuvable`);
      }
      return { message: `Mission ${id} supprimée.` };
    }
  }
  