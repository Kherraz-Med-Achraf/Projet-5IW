import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  ParseIntPipe,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { StaffService } from './staff.service';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CsrfGuard } from '../common/guards/csrf.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { User } from '../common/decorators/user.decorator';
import { Role } from '@prisma/client';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('staff')
export class StaffController {
  constructor(private readonly svc: StaffService) {}

  @Post()
  @Roles(Role.ADMIN)
  @UseGuards(CsrfGuard)
  create(@Body() dto: CreateStaffDto) {
    return this.svc.create(dto);
  }

  @Get()
  @Roles(Role.SECRETARY, Role.SERVICE_MANAGER, Role.DIRECTOR, Role.ADMIN)
  findAll() {
    return this.svc.findAll();
  }

  @Get(':id')
  @Roles(
    Role.SECRETARY,
    Role.SERVICE_MANAGER,
    Role.DIRECTOR,
    Role.ADMIN,
    Role.STAFF,
  )
  async findOne(
    @User() user: { id: string; role: Role },
    @Param('id', ParseIntPipe) id: number,
  ) {
    const profile = await this.svc.findOne(id);
    if (user.role === Role.STAFF && profile.userId !== user.id) {
      throw new NotFoundException(`Profil staff introuvable`);
    }
    return profile;
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @UseGuards(CsrfGuard)
  async update(
    @User() user: { id: string; role: Role },
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateStaffDto,
  ) {
    const profile = await this.svc.findOne(id);
    return this.svc.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @UseGuards(CsrfGuard)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.svc.remove(id);
  }
}
