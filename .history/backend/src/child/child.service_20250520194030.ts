import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateChildDto } from './dto/create-child.dto';
import { UpdateChildDto } from './dto/update-child.dto

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

  async updateForParent(
    parentProfileId: number,
    id: number,
    dto: UpdateChildDto,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const updateCount = await tx.child.updateMany({
        where: { id, parentProfileId },
        data: {
          ...(dto.firstName && { firstName: dto.firstName }),
          ...(dto.lastName && { lastName: dto.lastName }),
          ...(dto.birthDate && { birthDate: new Date(dto.birthDate) }),
          ...(dto.condition !== undefined && { condition: dto.condition }),
        },
      });
      if (updateCount.count === 0) {
        throw new NotFoundException(`Enfant ${id} introuvable`);
      }

      const child = await tx.child.findUnique({ where: { id } });
      if (!child) {
        throw new NotFoundException(
          `Enfant ${id} introuvable après mise à jour`,
        );
      }

      // recalcul du login
      const base = `${child.firstName[0].toLowerCase()}${child.lastName.toLowerCase()}`;
      let login = base;
      let suffix = 1;
      while (
        await tx.user.findUnique({ where: { email: `${login}@kids.local` } })
      ) {
        login = `${base}_${suffix++}`;
      }

      // mise à jour de l'email du compte enfant
      await tx.user.updateMany({
        where: { childProfile: { id } },
        data: { email: `${login}@kids.local` },
      });

      return child;
    });
  }

  async removeForParent(parentProfileId: number, id: number) {
    return this.prisma.$transaction(async (tx) => {
      // supprime le compte enfant
      await tx.user.deleteMany({
        where: { childProfile: { id } },
      });

      // supprime le profil enfant
      const result = await tx.child.deleteMany({
        where: { id, parentProfileId },
      });
      if (result.count === 0) {
        throw new NotFoundException(`Enfant ${id} introuvable`);
      }

      return { id };
    });
  }
}
