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

  /** Création d’un enfant — parent uniquement */
  @Post()
  @Roles(Role.PARENT)
  async create(
    @User() user: { id: string },
    @Body() dto: CreateChildDto,
  ): Promise<ChildResponseDto> {
    const parentProfile = await this.childService.prisma.parentProfile.findUnique({
      where: { userId: user.id },
    });
    if (!parentProfile) {
      throw new NotFoundException('Profil parent introuvable');
    }
    const child = await this.childService.createForParent(parentProfile.id, dto);
    return plainToInstance(ChildResponseDto, {
      ...child,
      birthDate: child.birthDate.toISOString(),
    });
  }

  /** Liste de tous les enfants — parents (leurs propres), secrétaire, service manager, directeur, admin */
  @Get()
  @Roles(
    Role.PARENT,
    Role.SECRETARY,
    Role.SERVICE_MANAGER,
    Role.DIRECTOR,
    Role.ADMIN,
  )
  async findAll(
    @User() user: { id: string; role: Role },
  ): Promise<ChildResponseDto[]> {
    let children: any[];
    if (user.role === Role.PARENT) {
      const parentProfile = await this.childService.prisma.parentProfile.findUnique({
        where: { userId: user.id },
      });
      if (!parentProfile) throw new NotFoundException('Profil parent introuvable');
      children = await this.childService.findAllForParent(parentProfile.id);
    } else {
      children = await this.childService.findAll();
    }
    return children.map(c =>
      plainToInstance(ChildResponseDto, {
        ...c,
        birthDate: c.birthDate.toISOString(),
      }),
    );
  }

  /** Récupère un enfant par ID — mêmes rôles que pour findAll */
  @Get(':id')
  @Roles(
    Role.PARENT,
    Role.SECRETARY,
    Role.SERVICE_MANAGER,
    Role.DIRECTOR,
    Role.ADMIN,
  )
  async findOne(
    @User() user: { id: string; role: Role },
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ChildResponseDto> {
    if (user.role === Role.PARENT) {
      const parentProfile = await this.childService.prisma.parentProfile.findUnique({
        where: { userId: user.id },
      });
      if (!parentProfile) throw new NotFoundException('Profil parent introuvable');
      const child = await this.childService.findOneForParent(parentProfile.id, id);
      if (!child) throw new NotFoundException(`Enfant ${id} introuvable`);
      return plainToInstance(ChildResponseDto, {
        ...child,
        birthDate: child.birthDate.toISOString(),
      });
    }
    const child = await this.childService.findOne(id);
    if (!child) throw new NotFoundException(`Enfant ${id} introuvable`);
    return plainToInstance(ChildResponseDto, {
      ...child,
      birthDate: child.birthDate.toISOString(),
    });
  }

  /** Mise à jour d’un enfant — parent (ses propres), service manager, directeur, admin */
  @Patch(':id')
  @Roles(
    Role.PARENT,
    Role.SERVICE_MANAGER,
    Role.DIRECTOR,
    Role.ADMIN,
  )
  async update(
    @User() user: { id: string; role: Role },
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateChildDto,
  ): Promise<ChildResponseDto> {
    if (user.role === Role.PARENT) {
      const parentProfile = await this.childService.prisma.parentProfile.findUnique({
        where: { userId: user.id },
      });
      if (!parentProfile) throw new NotFoundException('Profil parent introuvable');
      const child = await this.childService.updateForParent(parentProfile.id, id, dto);
      return plainToInstance(ChildResponseDto, {
        ...child,
        birthDate: child.birthDate.toISOString(),
      });
    }
    // service manager / directeur / admin
    const child = await this.childService.update(id, dto);
    return plainToInstance(ChildResponseDto, {
      ...child,
      birthDate: child.birthDate.toISOString(),
    });
  }

  /** Suppression d’un enfant — parent (ses propres), service manager, directeur, admin */
  @Delete(':id')
  @Roles(
    Role.PARENT,
    Role.SERVICE_MANAGER,
    Role.DIRECTOR,
    Role.ADMIN,
  )
  async remove(
    @User() user: { id: string; role: Role },
    @Param('id', ParseIntPipe) id: number,
  ) {
    if (user.role === Role.PARENT) {
      const parentProfile = await this.childService.prisma.parentProfile.findUnique({
        where: { userId: user.id },
      });
      if (!parentProfile) throw new NotFoundException('Profil parent introuvable');
      await this.childService.removeForParent(parentProfile.id, id);
    } else {
      await this.childService.remove(id);
    }
    return { message: `Enfant ${id} supprimé.` };
  }
}
