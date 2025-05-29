// src/secretary/secretary.service.ts
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

    // 1) Vérifier que l'email n'est pas déjà utilisé
    if (await this.prisma.user.findUnique({ where: { email } })) {
      throw new BadRequestException('Email déjà utilisé');
    }

    // 2) Hasher le mot de passe
    const hashed = await bcrypt.hash(password, 10);

    // 3) Transaction pour créer USER + SecretaryProfile
    return this.prisma.$transaction(async tx => {
      // a) Création du USER
      const user = await tx.user.create({
        data: {
          email,
          password: hashed,
          role: Role.SECRETARY,
          emailVerified: true,
        },
      });

      // b) Création du SecretaryProfile lié
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

      // 4) Retourner un objet fusionnant l'essentiel des deux
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
    return this.prisma.secretaryProfile.findMany({
      include: { user: true },
    });
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

  /** Met à jour un profil secrétaire */
  async update(id: number, dto: UpdateSecretaryDto) {
    await this.findOne(id);
    return this.prisma.secretaryProfile.update({
      where: { id },
      data: {
        ...(dto.firstName !== undefined && { firstName: dto.firstName }),
        ...(dto.lastName !== undefined && { lastName: dto.lastName }),
        ...(dto.birthDate && { birthDate: new Date(dto.birthDate) }),
        ...(dto.phone && { phone: dto.phone }),
        ...(dto.specialty && { specialty: dto.specialty }),
        ...(dto.startDate && { startDate: new Date(dto.startDate) }),
        ...(dto.profileImage !== undefined && { profileImage: dto.profileImage }),
      },
    });
  }

  /** Supprime un profil secrétaire (cascade supprime aussi le USER) */
  async remove(id: number) {
    const count = await this.prisma.secretaryProfile.deleteMany({
      where: { id },
    });
    if (count.count === 0) {
      throw new NotFoundException(`Secrétaire ${id} introuvable`);
    }
    return { id };
  }
}
