import { Controller, Get, Param, ParseIntPipe, NotFoundException, Body, Post, Patch, Delete } from '@nestjs/common';
import { AcademicYearService } from './academic-year.service';

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

// Note : on a retiré @UseGuards(...) complètement
@Controller('academic-year')
export class AcademicYearController {
  constructor(private readonly service: AcademicYearService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateAcademicYearDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAcademicYearDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
