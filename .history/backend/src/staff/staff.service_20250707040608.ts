import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';

@Injectable()
export class StaffService {
  constructor(private readonly prisma: PrismaService) {}

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
        `Un membre du personnel "${firstName} ${lastName}" existe déjà.`,
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

    return profiles;
  }

  async findOne(id: number) {
    const profile = await this.prisma.staffProfile.findUnique({
      where: { id },
      include: { user: true },
    });
    if (!profile) {
      throw new NotFoundException(`Membre du personnel ${id} introuvable`);
    }

    return profile;
  }

  async update(id: number, dto: UpdateStaffDto) {
    const existing = await this.findOne(id);

    if (
      (dto.firstName && dto.firstName !== existing.firstName) ||
      (dto.lastName && dto.lastName !== existing.lastName)
    ) {
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
          `Un autre membre du personnel "${newFirst} ${newLast}" existe déjà.`,
        );
      }
    }

    return this.prisma.staffProfile.update({
      where: { id },
      data: {
        ...(dto.firstName !== undefined && { firstName: dto.firstName }),
        ...(dto.lastName !== undefined && { lastName: dto.lastName }),
        ...(dto.birthDate !== undefined && {
          birthDate: new Date(dto.birthDate),
        }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.discipline !== undefined && { discipline: dto.discipline }),
        ...(dto.specialty !== undefined && { specialty: dto.specialty }),
      },
    });
  }

  async remove(id: number) {
    const staff = await this.prisma.staffProfile.findUnique({
      where: { id },
      select: { userId: true },
    });
    
    if (!staff) {
      throw new NotFoundException(`Membre du personnel ${id} introuvable`);
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.staffProfile.delete({
        where: { id },
      });
      
      await tx.user.delete({
        where: { id: staff.userId },
      });
      
      return { id };
    });
  }
}
