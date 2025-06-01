import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateChildDto } from './dto/create-child.dto';
import { UpdateChildDto } from './dto/update-child.dto';

@Injectable()
export class ChildService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateChildDto) {
    return this.prisma.child.create({
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        birthDate: new Date(dto.birthDate),
        condition: dto.condition,
        parent: { connect: { id: dto.parentProfileId } },
      },
      include: { parent: true },
    });
  }

  async findAll() {
    return this.prisma.child.findMany({
      include: { parent: true },
    });
  }

  async findOne(id: number) {
    return this.prisma.child.findUnique({
      where: { id },
      include: { parent: true },
    });
  }

  async update(id: number, dto: UpdateChildDto) {
    // Préparation des champs à mettre à jour
    const data: any = { ...dto };
    if (dto.birthDate) {
      data.birthDate = new Date(dto.birthDate);
    }
    if (dto.parentProfileId) {
      data.parent = { connect: { id: dto.parentProfileId } };
    }

    return this.prisma.child.update({
      where: { id },
      data,
      include: { parent: true },
    });
  }

  async remove(id: number) {
    return this.prisma.child.delete({
      where: { id },
    });
  }
}
