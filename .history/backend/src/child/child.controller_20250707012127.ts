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
  ForbiddenException,
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

  @Post(':parentId')
  @Roles(Role.SERVICE_MANAGER, Role.DIRECTOR, Role.ADMIN)
  async create(
    @Param('parentId', ParseIntPipe) parentProfileId: number,
    @Body() dto: CreateChildDto,
  ): Promise<ChildResponseDto> {
    const child = await this.childService.createForParent(parentProfileId, dto);
    return plainToInstance(ChildResponseDto, {
      ...child,
      birthDate: child.birthDate.toISOString(),
    });
  }

  @Get()
  @Roles(
    Role.PARENT,
    Role.STAFF,
    Role.SECRETARY,
    Role.SERVICE_MANAGER,
    Role.DIRECTOR,
    Role.ADMIN,
  )
  async findAll(
    @User() user: { id: string; role: Role },
  ): Promise<ChildResponseDto[]> {
    console.log('[ChildController] findAll appelé, user:', { id: user.id, role: user.role });
    let children: any[];
    if (user.role === Role.PARENT) {
      console.log('[ChildController] Utilisateur identifié comme PARENT');
      const parentProfile =
        await this.childService.prisma.parentProfile.findUnique({
          where: { userId: user.id },
        });
      if (!parentProfile) {
        console.log('[ChildController] ERREUR: Profil parent introuvable pour userId:', user.id);
        throw new NotFoundException('Profil parent introuvable');
      }
      console.log('[ChildController] Profil parent trouvé, ID:', parentProfile.id);
      children = await this.childService.findAllForParent(parentProfile.id);
      console.log('[ChildController] Enfants du parent récupérés:', children.length);
    } else {
      console.log('[ChildController] Utilisateur non-parent, récupération de tous les enfants');
      children = await this.childService.findAll();
    }

    return children.map((c) =>
      plainToInstance(ChildResponseDto, {
        ...c,
        birthDate: c.birthDate.toISOString(),
      }),
    );
  }

  @Get('referents')
  @Roles(
    Role.STAFF,
    Role.TEACHER,
    Role.SERVICE_MANAGER,
    Role.SECRETARY,
    Role.DIRECTOR,
    Role.ADMIN,
  )
  async findReferentChildren(
    @User() user: { id: string; role: Role },
  ): Promise<ChildResponseDto[]> {
    if (user.role === Role.CHILD) {
      throw new ForbiddenException(
        'Accès interdit : les enfants ne peuvent pas accéder à cette fonctionnalité.',
      );
    }

    const children = await this.childService.findAllReferent(user.id);
    return children.map((c) =>
      plainToInstance(ChildResponseDto, {
        ...c,
        birthDate: c.birthDate.toISOString(),
      }),
    );
  }

  @Get('me')
  @Roles(Role.CHILD)
  async findMyself(
    @User() user: { id: string; role: Role },
  ): Promise<ChildResponseDto> {
    const childUser = await this.childService.prisma.user.findUnique({
      where: { id: user.id },
      include: { childProfile: true },
    });

    if (!childUser || !childUser.childProfile) {
      throw new NotFoundException('Profil enfant introuvable');
    }

    return plainToInstance(ChildResponseDto, {
      ...childUser.childProfile,
      birthDate: childUser.childProfile.birthDate.toISOString(),
    });
  }

  @Get(':id')
  @Roles(
    Role.PARENT,
    Role.STAFF,
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
      const parentProfile =
        await this.childService.prisma.parentProfile.findUnique({
          where: { userId: user.id },
        });
      if (!parentProfile) {
        throw new NotFoundException('Profil parent introuvable');
      }
      const child = await this.childService.findOneForParent(
        parentProfile.id,
        id,
      );
      if (!child) {
        throw new NotFoundException(`Enfant ${id} introuvable`);
      }
      return plainToInstance(ChildResponseDto, {
        ...child,
        birthDate: child.birthDate.toISOString(),
      });
    }
    const child = await this.childService.findOne(id);
    if (!child) {
      throw new NotFoundException(`Enfant ${id} introuvable`);
    }
    return plainToInstance(ChildResponseDto, {
      ...child,
      birthDate: child.birthDate.toISOString(),
    });
  }

  @Patch(':id')
  @Roles(Role.PARENT, Role.SERVICE_MANAGER, Role.DIRECTOR, Role.ADMIN)
  async update(
    @User() user: { id: string; role: Role },
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateChildDto,
  ): Promise<ChildResponseDto> {
    if (user.role === Role.PARENT) {
      const parentProfile =
        await this.childService.prisma.parentProfile.findUnique({
          where: { userId: user.id },
        });
      if (!parentProfile) {
        throw new NotFoundException('Profil parent introuvable');
      }
      const child = await this.childService.updateForParent(
        parentProfile.id,
        id,
        dto,
      );
      return plainToInstance(ChildResponseDto, {
        ...child,
        birthDate: child.birthDate.toISOString(),
      });
    }
    const child = await this.childService.update(id, dto);
    return plainToInstance(ChildResponseDto, {
      ...child,
      birthDate: child.birthDate.toISOString(),
    });
  }

  @Patch(':id/image-consent')
  @Roles(Role.PARENT)
  async updateImageConsent(
    @User() user: { id: string; role: Role },
    @Param('id', ParseIntPipe) childId: number,
    @Body() body: { imageConsent: boolean },
  ): Promise<ChildResponseDto> {
    const parentProfile =
      await this.childService.prisma.parentProfile.findUnique({
        where: { userId: user.id },
      });
    if (!parentProfile) {
      throw new NotFoundException('Profil parent introuvable');
    }

    const child = await this.childService.updateImageConsentForParent(
      parentProfile.id,
      childId,
      body.imageConsent,
    );

    return plainToInstance(ChildResponseDto, {
      ...child,
      birthDate: child.birthDate.toISOString(),
    });
  }

  @Delete(':id')
  @Roles(Role.SERVICE_MANAGER, Role.DIRECTOR, Role.ADMIN)
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.childService.remove(id);
    return { message: `Enfant ${id} supprimé.` };
  }
}
