// src/staff/staff.service.ts
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';

@Injectable()
export class StaffService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateStaffDto) {
    const { email, password, firstName, lastName, phone, discipline, specialty } = dto;

    // 1) Vérifier l'unicité de l'email
    if (await this.prisma.user.findUnique({ where: { email } })) {
      throw new BadRequestException('Email déjà utilisé');
    }

    // 2) Hash du mot de passe
    const hashed = await bcrypt.hash(password, 10);

    // 3) Transaction : créer le User puis le StaffProfile
    return this.prisma.$transaction(async tx => {
      const user = await tx.user.create({
        data: {
          email,
          password: hashed,
          role: Role.STAFF,
          emailVerified: true, // bypass si souhaité
        },
      });

      const profile = await tx.staffProfile.create({
        data: {
          user: { connect: { id: user.id } },
          firstName,
          lastName,
          phone,
          discipline,
          specialty,
        },
      });

      // 4) Retourner un objet fusionné
      return {
        id: profile.id,
        userId: user.id,
        firstName: profile.firstName,
        lastName: profile.lastName,
        phone: profile.phone,
        discipline: profile.discipline,
        specialty: profile.specialty,
        createdAt: profile.createdAt,
        updatedAt: profile.updatedAt,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
        },
      };
    });
  }

  /** Récupère tous les profils staff */
  findAll() {
    return this.prisma.staffProfile.findMany({
      include: { user: true },
    });
  }

  /** Récupère un profil staff par ID */
  async findOne(id: number) {
    const prof = await this.prisma.staffProfile.findUnique({
      where: { id },
      include: { user: true },
    });
    if (!prof) {
      throw new NotFoundException(`Staff ${id} introuvable`);
    }
    return prof;
  }

  /** Met à jour un profil staff */
  async update(id: number, dto: UpdateStaffDto) {
    await this.findOne(id);
    return this.prisma.staffProfile.update({
      where: { id },
      data: {
        ...(dto.firstName !== undefined && { firstName: dto.firstName }),
        ...(dto.lastName !== undefined && { lastName: dto.lastName }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.discipline !== undefined && { discipline: dto.discipline }),
        ...(dto.specialty !== undefined && { specialty: dto.specialty }),
      },
    });
  }

  /** Supprime un profil staff (cascade supprime aussi le User) */
  async remove(id: number) {
    const count = await this.prisma.staffProfile.deleteMany({ where: { id } });
    if (count.count === 0) {
      throw new NotFoundException(`Staff ${id} introuvable`);
    }
    return { id };
  }
}
