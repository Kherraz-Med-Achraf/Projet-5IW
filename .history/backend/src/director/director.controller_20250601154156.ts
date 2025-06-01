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
import { DirectorService } from './director.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { CreateDirectorDto } from './dto/create-director.dto';
import { UpdateDirectorDto } from './dto/update-director.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('directors')
export class DirectorController {
  constructor(private readonly svc: DirectorService) {}

  /** Création accessible à DIRECTOR et ADMIN */
  @Post()
  @Roles(Role.DIRECTOR, Role.ADMIN)
  create(@Body() dto: CreateDirectorDto) {
    return this.svc.create(dto);
  }

  @Get()
  @Roles(Role.SECRETARY, Role.SERVICE_MANAGER, Role.DIRECTOR, Role.ADMIN)
  findAll() {
    return this.svc.findAll();
  }

  @Get(':id')
  @Roles(Role.SECRETARY, Role.SERVICE_MANAGER, Role.DIRECTOR, Role.ADMIN)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.svc.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.DIRECTOR, Role.ADMIN)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDirectorDto,
  ) {
    return this.svc.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.DIRECTOR, Role.ADMIN)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.svc.remove(id);
  }
}
