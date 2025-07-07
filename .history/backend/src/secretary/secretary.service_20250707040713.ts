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

  async create(dto: CreateSecretaryDto) {
    const {
      email,
      password,
      firstName,
      lastName,
      birthDate,
      phone,
      startDate,
      profileImage,
      specialty,
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
          firstName,
          lastName,
          birthDate: new Date(birthDate),
          phone,
          startDate: new Date(startDate),
          profileImage,
          specialty,
        },
      });

      return {
        id: profile.id,
        userId: user.id,
        firstName: profile.firstName,
        lastName: profile.lastName,
        birthDate: profile.birthDate,
        phone: profile.phone,
        startDate: profile.startDate,
        profileImage: profile.profileImage,
        specialty: profile.specialty,
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
        ...(dto.firstName !== undefined && { firstName: dto.firstName }),
        ...(dto.lastName !== undefined && { lastName: dto.lastName }),
        ...(dto.birthDate !== undefined && {
          birthDate: new Date(dto.birthDate),
        }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.startDate !== undefined && {
          startDate: new Date(dto.startDate),
        }),
        ...(dto.profileImage !== undefined && {
          profileImage: dto.profileImage,
        }),
        ...(dto.specialty !== undefined && { specialty: dto.specialty }),
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
