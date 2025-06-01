// src/director/director.service.ts
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDirectorDto } from './dto/create-director.dto';
import { UpdateDirectorDto } from './dto/update-director.dto';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';

@Injectable()
export class DirectorService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateDirectorDto) {
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

    const duplicate = await this.prisma.directorProfile.findFirst({
      where: { firstName, lastName },
    });
    if (duplicate) {
      throw new BadRequestException(
        `Un directeur "${firstName} ${lastName}" existe déjà.`,
      );
    }

    const hashed = await bcrypt.hash(password, 10);
    return this.prisma.$transaction(async tx => {
      const user = await tx.user.create({
        data: {
          email,
          password: hashed,
          role: Role.DIRECTOR,
          emailVerified: true,
        },
      });

      const profile = await tx.directorProfile.create({
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

  findAll() {
    return this.prisma.directorProfile.findMany({ include: { user: true } });
  }

  async findOne(id: number) {
    const dir = await this.prisma.directorProfile.findUnique({
      where: { id },
      include: { user: true },
    });
    if (!dir) {
      throw new NotFoundException(`Directeur ${id} introuvable`);
    }
    return dir;
  }

  async update(id: number, dto: UpdateDirectorDto) {
    const existing = await this.findOne(id);

    if (
      (dto.firstName && dto.firstName !== existing.firstName) ||
      (dto.lastName && dto.lastName !== existing.lastName)
    ) {
      const newFirst = dto.firstName ?? existing.firstName;
      const newLast = dto.lastName ?? existing.lastName;
      const duplicate = await this.prisma.directorProfile.findFirst({
        where: {
          id: { not: id },
          firstName: newFirst,
          lastName: newLast,
        },
      });
      if (duplicate) {
        throw new BadRequestException(
          `Un autre directeur "${newFirst} ${newLast}" existe déjà.`,
        );
      }
    }

    return this.prisma.directorProfile.update({
      where: { id },
      data: {
        ...(dto.jobTitle !== undefined && { jobTitle: dto.jobTitle }),
        ...(dto.startDate !== undefined && { startDate: new Date(dto.startDate) }),
        ...(dto.profileImage !== undefined && { profileImage: dto.profileImage }),
        ...(dto.firstName !== undefined && { firstName: dto.firstName }),
        ...(dto.lastName !== undefined && { lastName: dto.lastName }),
        ...(dto.birthDate !== undefined && { birthDate: new Date(dto.birthDate) }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
      },
    });
  }

  /** Supprime un directeur (cascade supprime aussi le User) */
  async remove(id: number) {
    const count = await this.prisma.directorProfile.deleteMany({
      where: { id },
    });
    if (count.count === 0) {
      throw new NotFoundException(`Directeur ${id} introuvable`);
    }
    return { id };
  }
}
