// src/child/child.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateChildDto } from './dto/create-child.dto';
import { UpdateChildDto } from './dto/update-child.dto';

@Injectable()
export class ChildService {
  constructor(public readonly prisma: PrismaService) {}

  async createForParent(parentProfileId: number, dto: CreateChildDto) {
    return this.prisma.child.create({
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        birthDate: new Date(dto.birthDate),
        condition: dto.condition,
        parent: { connect: { id: parentProfileId } },
      },
    });
  }

  async findAllForParent(parentProfileId: number) {
    return this.prisma.child.findMany({
      where: { parentProfileId },
    });
  }

  async findOneForParent(parentProfileId: number, id: number) {
    return this.prisma.child.findFirst({
      where: { id, parentProfileId },
    });
  }

  async updateForParent(parentProfileId: number, id: number, dto: UpdateChildDto) {
    const result = await this.prisma.child.updateMany({
      where: { id, parentProfileId },
      data: {
        ...(dto.firstName && { firstName: dto.firstName }),
        ...(dto.lastName && { lastName: dto.lastName }),
        ...(dto.birthDate && { birthDate: new Date(dto.birthDate) }),
        ...(dto.condition !== undefined && { condition: dto.condition }),
      },
    });

    if (result.count === 0) {
      throw new NotFoundException(`Enfant ${id} introuvable`);
    }

    const updated = await this.findOneForParent(parentProfileId, id);
    if (!updated) {
      throw new NotFoundException(`Enfant ${id} introuvable après mise à jour`);
    }
    return updated;
  }

  async removeForParent(parentProfileId: number, id: number) {
    const result = await this.prisma.child.deleteMany({
      where: { id, parentProfileId },
    });
    if (result.count === 0) {
      throw new NotFoundException(`Enfant ${id} introuvable`);
    }
    return { id };
  }
}
