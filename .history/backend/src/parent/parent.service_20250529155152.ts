// src/parent/parent.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateParentDto } from './dto/update-parent.dto';

@Injectable()
export class ParentService {
  constructor(private readonly prisma: PrismaService) {}

  /** Récupère tous les profils parents */
  async findAll() {
    return this.prisma.parentProfile.findMany({
      include: { user: true, emergencyContacts: true, children: true },
    });
  }

  /** Récupère un profil parent par ID */
  async findOne(id: number) {
    const profile = await this.prisma.parentProfile.findUnique({
      where: { id },
      include: { user: true, emergencyContacts: true, children: true },
    });
    if (!profile) {
      throw new NotFoundException(`Profil parent ${id} introuvable`);
    }
    return profile;
  }

  /**
   * Met à jour un profil parent.
   * Vérifie :
   *  - que le profil existe,
   *  - qu'aucun autre parent n'a le même couple prénom+nom.
   */
  async update(id: number, dto: UpdateParentDto) {
    // 1) Profil existant ?
    const profile = await this.prisma.parentProfile.findUnique({
      where: { id },
    });
    if (!profile) {
      throw new NotFoundException(`Profil parent ${id} introuvable`);
    }
    const newFirst = dto.firstName ?? profile.firstName;
    const newLast = dto.lastName ?? profile.lastName;

    // 3) Vérifier doublon prénom+nom
    const duplicate = await this.prisma.parentProfile.findFirst({
      where: {
        firstName: newFirst,
        lastName: newLast,
        id: { not: id },
      },
    });
    if (duplicate) {
      throw new BadRequestException(
        `Un parent "${newFirst} ${newLast}" existe déjà.`,
      );
    }
    return this.prisma.parentProfile.update({
      where: { id },
      data: { ...dto },
    });
  }

  async remove(id: number) {
    const deleteCount = await this.prisma.parentProfile.deleteMany({
      where: { id },
    });
    if (deleteCount.count === 0) {
      throw new NotFoundException(`Profil parent ${id} introuvable`);
    }
    return { id };
  }
}
