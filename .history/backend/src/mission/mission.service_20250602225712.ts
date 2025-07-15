// src/mission/mission.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Mission, Prisma } from '@prisma/client';

@Injectable()
export class MissionService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Recherche toutes les missions pour un enfant et une année scolaire donnés.
   */
  async findByChildAndYear(childId: number, academicYearId: number): Promise<Mission[]> {
    return this.prisma.mission.findMany({
      where: {
        childId,
        academicYearId,
      },
      orderBy: { id: 'asc' },
    });
  }

  /**
   * (Optionnel) CRUD de base pour une mission.
   */
  async create(data: Prisma.MissionCreateInput): Promise<Mission> {
    return this.prisma.mission.create({ data });
  }

  async update(id: number, data: Prisma.MissionUpdateInput): Promise<Mission> {
    // On s’assure que la mission existe
    const exists = await this.prisma.mission.findUnique({ where: { id } });
    if (!exists) {
      throw new NotFoundException(`Mission ${id} introuvable`);
    }
    return this.prisma.mission.update({ where: { id }, data });
  }

  async remove(id: number): Promise<Mission> {
    // Vérification d’existence
    const exists = await this.prisma.mission.findUnique({ where: { id } });
    if (!exists) {
      throw new NotFoundException(`Mission ${id} introuvable`);
    }
    return this.prisma.mission.delete({ where: { id } });
  }
}
