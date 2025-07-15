import {
  Controller,
  UseGuards,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  ParseIntPipe,
  ForbiddenException,
} from '@nestjs/common';
import { ParentService } from './parent.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { User } from '../common/decorators/user.decorator';
import { Role } from '@prisma/client';
import { UpdateParentDto } from './dto/update-parent.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('parents')
export class ParentController {
  constructor(private readonly svc: ParentService) {}
  @Get()
  @Roles(Role.SECRETARY, Role.ADMIN, Role.DIRECTOR, Role.SERVICE_MANAGER)
  async findAll() {
    return this.svc.findAll();
  }
  @Get(':id')
  @Roles(
    Role.SECRETARY,
    Role.ADMIN,
    Role.DIRECTOR,
    Role.SERVICE_MANAGER,
    Role.PARENT,
  )
  async findOne(
    @User() user: { id: string; role: Role },
    @Param('id', ParseIntPipe) id: number,
  ) {
    const profile = await this.svc.findOne(id);
    if (user.role === Role.PARENT && profile.userId !== user.id) {
      throw new ForbiddenException('Accès refusé à ce profil parent');
    }
    return profile;
  }
  @Patch(':id')
  @Roles(Role.PARENT, Role.ADMIN)
  async update(
    @User() user: { id: string; role: Role },
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateParentDto,
  ) {
    const profile = await this.svc.findOne(id);
    
    // Sécurité : un parent ne peut modifier que son propre profil
    if (user.role === Role.PARENT && profile.userId !== user.id) {
      throw new ForbiddenException('Vous ne pouvez modifier que votre propre profil');
    }
    
    return this.svc.update(id, dto);
  }
  @Delete(':id')
  @Roles(Role.ADMIN)
  async remove(
    @User() user: { id: string; role: Role },
    @Param('id', ParseIntPipe) id: number,
  ) {
    const profile = await this.svc.findOne(id);
    return this.svc.remove(id);
  }
}
