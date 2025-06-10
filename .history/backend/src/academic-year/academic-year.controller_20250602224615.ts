import { Controller, Get, Param, ParseIntPipe, NotFoundException, Body, Post, Patch, Delete } from '@nestjs/common';
import { AcademicYearService } from './academic-year.service';
// import { Roles } from '../common/decorators/roles.decorator';
// import { RolesGuard } from '../common/guards/roles.guard';
// import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

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

@Controller('academic-year')
export class AcademicYearController {
  constructor(private readonly service: AcademicYearService) {}

  /**
   * GET /academic-year
   * (Pour l’instant sans guard, juste pour tester la route brute.)
   */
  @Get()
  findAll() {
    return this.service.findAll();
  }

  /**
   * GET /academic-year/:id
   * Réactivez le guard et le RolesGuard plus tard.
   */
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles('STAFF', 'PARENT', 'DIRECTOR', 'ADMIN', 'SERVICE_MANAGER', 'SECRETARY')
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  /**
   * POST /academic-year
   */
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles('ADMIN')
  @Post()
  create(@Body() dto: CreateAcademicYearDto) {
    return this.service.create(dto);
  }

  /**
   * PATCH /academic-year/:id
   */
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles('ADMIN')
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAcademicYearDto,
  ) {
    return this.service.update(id, dto);
  }

  /**
   * DELETE /academic-year/:id
   */
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles('ADMIN')
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
