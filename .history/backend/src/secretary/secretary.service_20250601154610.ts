import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSecretaryDto } from './dto/create-secretary.dto';
import { UpdateSecretaryDto } from './dto/update-secretary.dto';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';

@Injectable()
export class SecretaryService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateSecretaryDto) {
    const {
      email,
      password,
      firstName,
      lastName,
      birthDate,
      phone,
      specialty,
      startDate,
      profileImage,
    } = dto;

    if (await this.prisma.user.findUnique({ where: { email } })) {
      throw new BadRequestException('Email déjà utilisé');
    }

    const existingName = await this.prisma.secretaryProfile.findFirst({
      where: { firstName, lastName },
    });
    if (existingName) {
      throw new BadRequestException(
        `Un secrétaire "${firstName} ${lastName}" existe déjà.`,
      );
    }

    const hashed = await bcrypt.hash(password, 10);
    return this.prisma.$transaction(async tx => {
      const user = await tx.user.create({
        data: {
          email,
          password: hashed,
          role: Role.SECRETARY,
          emailVerified: true,
        },
      });

      const profile = await tx.secretaryProfile.create({
        data: {
          user: { connect: { id: user.id } },
          firstName,
          lastName,
          birthDate: new Date(birthDate),
          phone,
          specialty,
          startDate: new Date(startDate),
          profileImage,
        },
      });

      return {
        id: profile.id,
        userId: user.id,
        firstName: profile.firstName,
        lastName: profile.lastName,
        birthDate: profile.birthDate,
        phone: profile.phone,
        specialty: profile.specialty,
        startDate: profile.startDate,
        profileImage: profile.profileImage,
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

  /** Récupère tous les profils de secrétaire */
  async findAll() {
    return this.prisma.secretaryProfile.findMany({ include: { user: true } });
  }

  /** Récupère un profil secrétaire par ID */
  async findOne(id: number) {
    const sec = await this.prisma.secretaryProfile.findUnique({
      where: { id },
      include: { user: true },
    });
    if (!sec) {
      throw new NotFoundException(`Secrétaire ${id} introuvable`);
    }
    return sec;
  }

  /**
   * Met à jour un profil secrétaire en vérifiant unicité prénom+nom
   */
  async update(id: number, dto: UpdateSecretaryDto) {
    const existing = await this.findOne(id);

    const { firstName, lastName, birthDate, phone, specialty, startDate, profileImage } = dto;

    // Si prénom ou nom changent, vérifier doublon
    if ((firstName && firstName !== existing.firstName) ||
        (lastName && lastName !== existing.lastName)) {
      const dup = await this.prisma.secretaryProfile.findFirst({
        where: {
          firstName: firstName ?? existing.firstName,
          lastName: lastName ?? existing.lastName,
          id: { not: id },
        },
      });
      if (dup) {
        throw new BadRequestException(
          `Un autre secrétaire "${firstName ?? existing.firstName} ${lastName ?? existing.lastName}" existe déjà.`,
        );
      }
    }

    return this.prisma.secretaryProfile.update({
      where: { id },
      data: {
        ...(firstName !== undefined && { firstName }),
        ...(lastName !== undefined && { lastName }),
        ...(birthDate && { birthDate: new Date(birthDate) }),
        ...(phone && { phone }),
        ...(specialty && { specialty }),
        ...(startDate && { startDate: new Date(startDate) }),
        ...(profileImage !== undefined && { profileImage }),
      },
    });
  }

  /** Supprime un profil secrétaire (cascade supprime aussi le USER) */
  async remove(id: number) {
    const count = await this.prisma.secretaryProfile.deleteMany({ where: { id } });
    if (count.count === 0) {
      throw new NotFoundException(`Secrétaire ${id} introuvable`);
    }
    return { id };
  }
}
