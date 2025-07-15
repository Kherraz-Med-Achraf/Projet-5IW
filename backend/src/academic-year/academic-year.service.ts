import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class AcademicYearService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Renvoie toutes les années scolaires, triées de la plus récente à la plus ancienne.
   */
  async findAll() {
    return this.prisma.academicYear.findMany({
      orderBy: { startDate: 'desc' },
      select: {
        id: true,
        label: true,
        startDate: true,
        endDate: true,
      },
    });
  }

  /**
   * Renvoie une année scolaire par son ID.
   * Si non trouvée, lance NotFoundException.
   */
  async findOne(id: number) {
    const year = await this.prisma.academicYear.findUnique({
      where: { id },
      select: {
        id: true,
        label: true,
        startDate: true,
        endDate: true,
      },
    });
    if (!year) {
      throw new NotFoundException(`Année scolaire avec ID ${id} introuvable`);
    }
    return year;
  }

  /**
   * (Optionnel pour plus tard) Crée une nouvelle année scolaire.
   */
  async create(data: { label: string; startDate: Date; endDate: Date }) {
    return this.prisma.academicYear.create({ data });
  }

  /**
   * (Optionnel) Met à jour une année scolaire existante.
   */
  async update(
    id: number,
    data: Partial<{ label: string; startDate: Date; endDate: Date }>,
  ) {
    await this.findOne(id);
    return this.prisma.academicYear.update({
      where: { id },
      data,
    });
  }

  /**
   * (Optionnel) Supprime une année scolaire.
   */
  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.academicYear.delete({ where: { id } });
  }
}
