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

  async findAll() {
    const profiles = await this.prisma.secretaryProfile.findMany({
      include: { user: true },
    });

    // Masquer les données sensibles pour la sécurité
    return profiles.map((profile) => ({
      ...profile,
      phone: this.maskPhoneNumber(profile.phone),
    }));
  }

  async findOne(id: number) {
    const sec = await this.prisma.secretaryProfile.findUnique({
      where: { id },
      include: { user: true },
    });
    if (!sec) {
      throw new NotFoundException(`Secrétaire ${id} introuvable`);
    }

    // Masquer les données sensibles pour la sécurité
    return {
      ...sec,
      phone: this.maskPhoneNumber(sec.phone),
    };
  }

  async update(id: number, dto: UpdateSecretaryDto) {
    const existing = await this.findOne(id);

    const {
      firstName,
      lastName,
      birthDate,
      phone,
      specialty,
      startDate,
      profileImage,
    } = dto;
    if (
      (firstName && firstName !== existing.firstName) ||
      (lastName && lastName !== existing.lastName)
    ) {
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
