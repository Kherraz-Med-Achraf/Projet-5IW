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
  NotFoundException,
} from '@nestjs/common';
import { DirectorService } from './director.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { User } from '../common/decorators/user.decorator';
import { Role } from '@prisma/client';
import { CreateDirectorDto } from './dto/create-director.dto';
import { UpdateDirectorDto } from './dto/update-director.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('directors')
export class DirectorController {
  constructor(private readonly svc: DirectorService) {}

  @Post()
  @Roles(Role.ADMIN)
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
  async findOne(
    @User() user: { id: string; role: Role },
    @Param('id', ParseIntPipe) id: number,
  ) {
    const profile = await this.svc.findOne(id);
    if (user.role === Role.DIRECTOR && profile.userId !== user.id) {
      throw new NotFoundException(`Profil directeur introuvable`);
    }
    return profile;
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  async update(
    @User() user: { id: string; role: Role },
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDirectorDto,
  ) {
    const profile = await this.svc.findOne(id);
    return this.svc.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.svc.remove(id);
  }
}
