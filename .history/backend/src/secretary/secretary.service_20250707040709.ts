import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSecretaryDto } from './dto/create-secretary.dto';
import { UpdateSecretaryDto } from './dto/update-secretary.dto';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';

@Injectable()
export class SecretaryService {
  constructor(private readonly prisma: PrismaService) {}

  /** Masque partiellement un numéro de téléphone pour la sécurité */
  private maskPhoneNumber(phone: string | null): string | null {
    if (!phone) return null;
    // Supprimer tous les espaces et caractères non numériques
    const cleanPhone = phone.replace(/\D/g, '');
    // Pour les numéros français (10 chiffres), masquer le milieu
    if (cleanPhone.length === 10) {
      return `${cleanPhone.slice(0, 2)} ${cleanPhone.slice(2, 4)} ** ** ${cleanPhone.slice(8, 10)}`;
    }
    // Pour d'autres formats, masquer la partie centrale
    if (cleanPhone.length >= 6) {
      const start = cleanPhone.slice(0, 2);
      const end = cleanPhone.slice(-2);
      return `${start}****${end}`;
    }
    // Si le numéro est trop court, le masquer complètement
    return '****';
  }

  async create(dto: CreateSecretaryDto) {
    const {
      email,
      password,
      jobTitle,
      startDate,
      profileImage,
      firstName,
      lastName,
      birthDate,
      phone,
    } = dto;

    if (await this.prisma.user.findUnique({ where: { email } })) {
      throw new BadRequestException('Email déjà utilisé');
    }

    const duplicate = await this.prisma.secretaryProfile.findFirst({
      where: { firstName, lastName },
    });
    if (duplicate) {
      throw new BadRequestException(
        `Une secrétaire "${firstName} ${lastName}" existe déjà.`,
      );
    }

    const hashed = await bcrypt.hash(password, 10);
    return this.prisma.$transaction(async (tx) => {
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
          jobTitle,
          startDate: new Date(startDate),
          profileImage,
          firstName,
          lastName,
          birthDate: new Date(birthDate),
          phone,
        },
      });

      return {
        id: profile.id,
        userId: user.id,
        jobTitle: profile.jobTitle,
        startDate: profile.startDate,
        profileImage: profile.profileImage,
        firstName: profile.firstName,
        lastName: profile.lastName,
        birthDate: profile.birthDate,
        phone: profile.phone,
        createdAt: profile.createdAt,
        updatedAt: profile.updatedAt,
        user: { id: user.id, email: user.email, role: user.role },
      };
    });
  }

  async findAll() {
    const profiles = await this.prisma.secretaryProfile.findMany({
      include: { user: true },
    });

    return profiles;
  }

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

  async update(id: number, dto: UpdateSecretaryDto) {
    const existing = await this.findOne(id);

    if (
      (dto.firstName && dto.firstName !== existing.firstName) ||
      (dto.lastName && dto.lastName !== existing.lastName)
    ) {
      const newFirst = dto.firstName ?? existing.firstName;
      const newLast = dto.lastName ?? existing.lastName;
      const duplicate = await this.prisma.secretaryProfile.findFirst({
        where: {
          id: { not: id },
          firstName: newFirst,
          lastName: newLast,
        },
      });
      if (duplicate) {
        throw new BadRequestException(
          `Une autre secrétaire "${newFirst} ${newLast}" existe déjà.`,
        );
      }
    }

    return this.prisma.secretaryProfile.update({
      where: { id },
      data: {
        ...(dto.jobTitle !== undefined && { jobTitle: dto.jobTitle }),
        ...(dto.startDate !== undefined && {
          startDate: new Date(dto.startDate),
        }),
        ...(dto.profileImage !== undefined && {
          profileImage: dto.profileImage,
        }),
        ...(dto.firstName !== undefined && { firstName: dto.firstName }),
        ...(dto.lastName !== undefined && { lastName: dto.lastName }),
        ...(dto.birthDate !== undefined && {
          birthDate: new Date(dto.birthDate),
        }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
      },
    });
  }

  async remove(id: number) {
    const secretary = await this.prisma.secretaryProfile.findUnique({
      where: { id },
      select: { userId: true },
    });
    
    if (!secretary) {
      throw new NotFoundException(`Secrétaire ${id} introuvable`);
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.secretaryProfile.delete({
        where: { id },
      });
      
      await tx.user.delete({
        where: { id: secretary.userId },
      });
      
      return { id };
    });
  }
}
