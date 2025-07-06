import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import * as bcrypt from 'bcrypt';
import { Role, StaffProfile } from '@prisma/client';

@Injectable()
export class StaffService {
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

  async create(dto: CreateStaffDto) {
    const {
      email,
      password,
      firstName,
      lastName,
      phone,
      discipline,
      birthDate,
      specialty,
    } = dto;
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
    return this.prisma.$transaction(async (tx) => {
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

  async findAll() {
    const profiles = await this.prisma.staffProfile.findMany({
      include: { user: true },
    });

    // Masquer les données sensibles pour la sécurité
    return profiles.map((profile) => ({
      ...profile,
      phone: this.maskPhoneNumber(profile.phone),
    }));
  }

  async findOne(id: number) {
    const profile = await this.prisma.staffProfile.findUnique({
      where: { id },
      include: { user: true },
    });
    if (!profile) throw new NotFoundException(`Staff ${id} introuvable`);

    // Masquer les données sensibles pour la sécurité
    return {
      ...profile,
      phone: this.maskPhoneNumber(profile.phone),
    };
  }

  async update(id: number, dto: UpdateStaffDto) {
    const existing = await this.findOne(id);
    const newFirst = dto.firstName ?? existing.firstName;
    const newLast = dto.lastName ?? existing.lastName;
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
    return this.prisma.staffProfile.update({
      where: { id },
      data: {
        ...(dto.firstName !== undefined && { firstName: dto.firstName }),
        ...(dto.lastName !== undefined && { lastName: dto.lastName }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.discipline !== undefined && { discipline: dto.discipline }),
        ...(dto.birthDate !== undefined && {
          birthDate: new Date(dto.birthDate),
        }),
        ...(dto.specialty !== undefined && { specialty: dto.specialty }),
      },
    });
  }
  async remove(id: number) {
    const count = await this.prisma.staffProfile.deleteMany({ where: { id } });
    if (count.count === 0) {
      throw new NotFoundException(`Staff ${id} introuvable`);
    }
    return { id };
  }
}
