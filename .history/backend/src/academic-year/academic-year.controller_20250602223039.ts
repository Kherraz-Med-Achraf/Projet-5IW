import { Controller, Get, Param, ParseIntPipe, NotFoundException, UseGuards, Body, Post, Patch, Delete } from '@nestjs/common';
import { AcademicYearService } from './academic-year.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Roles } from '../auth/strategies

class CreateAcademicYearDto {
  label: string;      // ex. "2024-2025"
  startDate: Date;    // ex. ISO string
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
   * GET /academic-year
   * Renvoie la liste de toutes les années scolaires.
   * Accessible à STAFF, PARENT, DIRECTOR, ADMIN, etc.
   */
  @Roles('STAFF', 'PARENT', 'DIRECTOR', 'ADMIN', 'SERVICE_MANAGER', 'SECRETARY')
  @Get()
  findAll() {
    return this.service.findAll();
  }

  /**
   * GET /academic-year/:id
   * Renvoie une année scolaire par ID.
   */
  @Roles('STAFF', 'PARENT', 'DIRECTOR', 'ADMIN', 'SERVICE_MANAGER', 'SECRETARY')
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  /**
   * POST /academic-year
   * Création d’une nouvelle année.
   * Réservé aux ADMIN.
   * (On pourra activer plus tard quand le besoin se fera sentir.)
   */
  @Roles('ADMIN')
  @Post()
  create(@Body() dto: CreateAcademicYearDto) {
    return this.service.create(dto);
  }

  /**
   * PATCH /academic-year/:id
   * Mise à jour d’une année existante.
   * Réservé aux ADMIN.
   */
  @Roles('ADMIN')
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAcademicYearDto,
  ) {
    return this.service.update(id, dto);
  }

  /**
   * DELETE /academic-year/:id
   * Supprime une année scolaire (cascade sur missions & journaux).
   * Réservé aux ADMIN.
   */
  @Roles('ADMIN')
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
