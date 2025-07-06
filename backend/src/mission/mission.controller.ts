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

/**
 * Pour créer une mission, le front appellera désormais :
 *   POST /mission/child/:childId/year/:yearId    (body : { description })
 */
interface CreateMissionBody {
  description: string;
}

@Controller('mission')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MissionController {
  constructor(private readonly service: MissionService) {}

  // ---------- Lecture ----------
  @Roles(
    'STAFF',
    'DIRECTOR',
    'ADMIN',
    'TEACHER',
    'SERVICE_MANAGER',
    'SECRETARY',
  )
  @Get('child/:childId/year/:yearId')
  async findByChildAndYear(
    @Param('childId', ParseIntPipe) childId: number,
    @Param('yearId', ParseIntPipe) academicYearId: number,
  ) {
    return this.service.findByChildAndYear(childId, academicYearId);
  }

  // ---------- Création ----------
  @Roles('STAFF', 'ADMIN')
  @Post('child/:childId/year/:yearId')
  async createForChildYear(
    @Param('childId', ParseIntPipe) childId: number,
    @Param('yearId', ParseIntPipe) academicYearId: number,
    @Body() body: CreateMissionBody,
  ) {
    return this.service.create({
      description: body.description.trim(),
      child: { connect: { id: childId } },
      academicYear: { connect: { id: academicYearId } },
    });
  }

  // ---------- Suppression ----------
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
