import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import * as bcrypt from 'bcrypt';
import { Role, StaffProfile } from '@prisma/client';

@Injectable()
export class StaffService {
  constructor(private readonly prisma: PrismaService) {}
  async create(dto: CreateStaffDto) {
    const { email, password, firstName, lastName, phone, discipline, birthDate, specialty } = dto;
    if (await this.prisma.user.findUnique({ where: { email } })) {
      throw new BadRequestException('Email déjà utilisé');
    }
    const duplicate = await this.prisma.staffProfile.findFirst({
      where: { firstName, lastName },
    });
    if (duplicate) {
      throw new BadRequestException(
        `Un profil staff "${firstName} ${lastName}" existe déjà.`,
      );
    }
    const hashed = await bcrypt.hash(password, 10);
    return this.prisma.$transaction(async tx => {
      const user = await tx.user.create({
        data: {
          email,
          password: hashed,
          role: Role.STAFF,
          emailVerified: true,
        },
      });

      const profile = await tx.staffProfile.create({
        data: {
          user: { connect: { id: user.id } },
          firstName,
          lastName,
          phone,
          discipline,
          birthDate: new Date(birthDate),
          specialty,
        },
      });

      return {
        id: profile.id,
        userId: user.id,
        firstName: profile.firstName,
        lastName: profile.lastName,
        phone: profile.phone,
        discipline: profile.discipline,
        birthDate: profile.birthDate,
        specialty: profile.specialty,
        createdAt: profile.createdAt,
        updatedAt: profile.updatedAt,
        user: { id: user.id, email: user.email, role: user.role },
      };
    });
  }

  /** Récupère tous les profils staff */
  findAll() {
    return this.prisma.staffProfile.findMany({ include: { user: true } });
  }

  /** Récupère un profil staff par ID ou 404 */
  async findOne(id: number) {
    const profile = await this.prisma.staffProfile.findUnique({
      where: { id },
      include: { user: true },
    });
    if (!profile) throw new NotFoundException(`Staff ${id} introuvable`);
    return profile;
  }

  /**
   * Met à jour un profil staff en s’assurant qu’aucun autre profil
   * n’a le même prénom + nom.
   */
  async update(id: number, dto: UpdateStaffDto) {
    // 1) Profil existant ?
    const existing = await this.findOne(id);

    // 2) Détermine prénom/nom cibles
    const newFirst = dto.firstName ?? existing.firstName;
    const newLast = dto.lastName ?? existing.lastName;

    // 3) Vérif doublon sur les autres profils
    const duplicate = await this.prisma.staffProfile.findFirst({
      where: {
        id: { not: id },
        firstName: newFirst,
        lastName: newLast,
      },
    });
    if (duplicate) {
      throw new BadRequestException(
        `Un autre profil staff "${newFirst} ${newLast}" existe déjà.`,
      );
    }

    // 4) Mise à jour
    return this.prisma.staffProfile.update({
      where: { id },
      data: {
        ...(dto.firstName !== undefined && { firstName: dto.firstName }),
        ...(dto.lastName !== undefined && { lastName: dto.lastName }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.discipline !== undefined && { discipline: dto.discipline }),
        ...(dto.birthDate !== undefined && { birthDate: new Date(dto.birthDate) }),
        ...(dto.specialty !== undefined && { specialty: dto.specialty }),
      },
    });
  }

  /** Supprime un profil staff (cascade supprime l’utilisateur lié) */
  async remove(id: number) {
    const count = await this.prisma.staffProfile.deleteMany({ where: { id } });
    if (count.count === 0) {
      throw new NotFoundException(`Staff ${id} introuvable`);
    }
    return { id };
  }
}
