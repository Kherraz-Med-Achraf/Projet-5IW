// src/mission/mission.controller.ts
import { Controller, Get, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { MissionService } from './mission.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('mission')
@UseGuards(JwtAuthGuard, RolesGuard)
// Les rôles autorisés peuvent inclure STAFF, TEACHER, DIRECTOR, ADMIN, etc.
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

  // Vous pouvez ajouter d’autres endpoints CRUD si besoin (create, update, delete).
}
