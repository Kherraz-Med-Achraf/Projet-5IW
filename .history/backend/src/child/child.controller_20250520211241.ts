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
  @Roles(Role.PARENT)
  @Controller('children')
  export class ChildController {
    constructor(private readonly childService: ChildService) {}
  
    @Post()
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
  
    @Get()
    async findAll(@User() user: { id: string }): Promise<ChildResponseDto[]> {
      const parentProfile = await this.childService.prisma.parentProfile.findUnique({
        where: { userId: user.id },
      });
      if (!parentProfile) {
        throw new NotFoundException('Profil parent introuvable');
      }
      const children = await this.childService.findAllForParent(parentProfile.id);
      return children.map(c =>
        plainToInstance(ChildResponseDto, {
          ...c,
          birthDate: c.birthDate.toISOString(),
        }),
      );
    }
  
    @Get(':id')
    async findOne(
      @User() user: { id: string },
      @Param('id', ParseIntPipe) id: number,
    ): Promise<ChildResponseDto> {
      const parentProfile = await this.childService.prisma.parentProfile.findUnique({
        where: { userId: user.id },
      });
      if (!parentProfile) {
        throw new NotFoundException('Profil parent introuvable');
      }
      const child = await this.childService.findOneForParent(parentProfile.id, id);
      if (!child) {
        throw new NotFoundException(`Enfant ${id} introuvable`);
      }
      return plainToInstance(ChildResponseDto, {
        ...child,
        birthDate: child.birthDate.toISOString(),
      });
    }
  
    @Patch(':id')
    async update(
      @User() user: { id: string },
      @Param('id', ParseIntPipe) id: number,
      @Body() dto: UpdateChildDto,
    ): Promise<ChildResponseDto> {
      const parentProfile = await this.childService.prisma.parentProfile.findUnique({
        where: { userId: user.id },
      });
      if (!parentProfile) {
        throw new NotFoundException('Profil parent introuvable');
      }
      const child = await this.childService.updateForParent(parentProfile.id, id, dto);
      return plainToInstance(ChildResponseDto, {
        ...child,
        birthDate: child.birthDate.toISOString(),
      });
    }
  
    @Delete(':id')
    async remove(
      @User() user: { id: string },
      @Param('id', ParseIntPipe) id: number,
    ) {
      const parentProfile = await this.childService.prisma.parentProfile.findUnique({
        where: { userId: user.id },
      });
      if (!parentProfile) {
        throw new NotFoundException('Profil parent introuvable');
      }
      await this.childService.removeForParent(parentProfile.id, id);
      return { message: `Enfant ${id} supprimé.` };
    }
  }
  