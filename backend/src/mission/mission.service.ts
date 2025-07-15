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
  async findByChildAndYear(
    childId: number,
    academicYearId: number,
  ): Promise<Mission[]> {
    return this.prisma.mission.findMany({
      where: {
        childId,
        academicYearId,
      },
      orderBy: { id: 'asc' },
    });
  }

  /**
   * Crée une nouvelle mission pour un enfant et une année scolaire.
   */
  async create(data: Prisma.MissionCreateInput): Promise<Mission> {
    // Vérifie que l'enfant et l'année scolaire existent si besoin côté front ou contrôleur
    return this.prisma.mission.create({ data });
  }

  /**
   * Met à jour la description d'une mission existante.
   */
  async update(id: number, data: Prisma.MissionUpdateInput): Promise<Mission> {
    const existing = await this.prisma.mission.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Mission ${id} introuvable`);
    }
    return this.prisma.mission.update({
      where: { id },
      data,
    });
  }

  /**
   * Supprime une mission par son ID.
   */
  async remove(id: number): Promise<Mission> {
    const existing = await this.prisma.mission.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Mission ${id} introuvable`);
    }
    return this.prisma.mission.delete({ where: { id } });
  }
}
