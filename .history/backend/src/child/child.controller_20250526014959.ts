import {
  Controller,
  UseGuards,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  NotFoundException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { ChildService } from './child.service';
import { CreateChildDto } from './dto/create-child.dto';
import { UpdateChildDto } from './dto/update-child.dto';
import { ChildResponseDto } from './dto/child-response.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { User } from '../common/decorators/user.decorator';
import { Role } from '@prisma/client';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('children')
export class ChildController {
  constructor(private readonly childService: ChildService) {}

  /** Création réservée aux parents **/
  @Post()
  @Roles(Role.PARENT)
  async create(
    @User() user: { id: string },
    @Body() dto: CreateChildDto,
  ): Promise<ChildResponseDto> {
    const parent = await this.childService.prisma.parentProfile.findUnique({
      where: { userId: user.id },
    });
    if (!parent) throw new NotFoundException('Profil parent introuvable');
    const child = await this.childService.createForParent(parent.id, dto);
    return plainToInstance(ChildResponseDto, {
      ...child,
      birthDate: child.birthDate.toISOString(),
    });
  }

  /** Lecture de tous les enfants d’un parent – ou de tous (pour les autres rôles) **/
  @Get()
  @Roles(Role.PARENT, Role.SECRETARY, Role.SERVICE_MANAGER, Role.DIRECTOR, Role.ADMIN)
  async findAll(@User() user: { id: string; role: Role }): Promise<ChildResponseDto[]> {
    let children = [];
    if (user.role === Role.PARENT) {
      const parent = await this.childService.prisma.parentProfile.findUnique({
        where: { userId: user.id },
      });
      if (!parent) throw new NotFoundException('Profil parent introuvable');
      children = await this.childService.findAllForParent(parent.id);
    } else {
      children = await this.childService.findAll(); // exposez une méthode générique si besoin
    }
    return children.map(c =>
      plainToInstance(ChildResponseDto, {
        ...c,
        birthDate: c.birthDate.toISOString(),
      }),
    );
  }

  /** Lecture d’un enfant par ID **/
  @Get(':id')
  @Roles(Role.PARENT, Role.SECRETARY, Role.SERVICE_MANAGER, Role.DIRECTOR, Role.ADMIN)
  async findOne(
    @User() user: { id: string; role: Role },
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ChildResponseDto> {
    let child;
    if (user.role === Role.PARENT) {
      const parent = await this.childService.prisma.parentProfile.findUnique({
        where: { userId: user.id },
      });
      if (!parent) throw new NotFoundException('Profil parent introuvable');
      child = await this.childService.findOneForParent(parent.id, id);
    } else {
      child = await this.childService.findOne(id); // exposez une méthode générique si besoin
    }
    if (!child) throw new NotFoundException(`Enfant ${id} introuvable`);
    return plainToInstance(ChildResponseDto, {
      ...child,
      birthDate: child.birthDate.toISOString(),
    });
  }

  /** Modification – parent + staff autorisés **/
  @Patch(':id')
  @Roles(Role.PARENT, Role.SERVICE_MANAGER, Role.DIRECTOR, Role.ADMIN)
  async update(
    @User() user: { id: string; role: Role },
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateChildDto,
  ): Promise<ChildResponseDto> {
    let updated;
    if (user.role === Role.PARENT) {
      const parent = await this.childService.prisma.parentProfile.findUnique({
        where: { userId: user.id },
      });
      if (!parent) throw new NotFoundException('Profil parent introuvable');
      updated = await this.childService.updateForParent(parent.id, id, dto);
    } else {
      updated = await this.childService.update(id, dto); // exposez une méthode générique si besoin
    }
    return plainToInstance(ChildResponseDto, {
      ...updated,
      birthDate: updated.birthDate.toISOString(),
    });
  }

  /** Suppression – parent + staff autorisés **/
  @Delete(':id')
  @Roles(Role.PARENT, Role.SERVICE_MANAGER, Role.DIRECTOR, Role.ADMIN)
  async remove(
    @User() user: { id: string; role: Role },
    @Param('id', ParseIntPipe) id: number,
  ) {
    if (user.role === Role.PARENT) {
      const parent = await this.childService.prisma.parentProfile.findUnique({
        where: { userId: user.id },
      });
      if (!parent) throw new NotFoundException('Profil parent introuvable');
      await this.childService.removeForParent(parent.id, id);
    } else {
      await this.childService.remove(id); // exposez une méthode générique si besoin
    }
    return { message: `Enfant ${id} supprimé.` };
  }
}
