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
    const { email, password, discipline, specialty } = dto;
    if (await this.prisma.user.findUnique({ where: { email } })) {
      throw new BadRequestException('Email déjà utilisé');
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
          discipline,
          specialty,
        },
      });
      return {
        id: profile.id,
        userId: user.id,
        discipline: profile.discipline,
        specialty: profile.specialty,
        createdAt: profile.createdAt,
        updatedAt: profile.updatedAt,
        user: { id: user.id, email: user.email, role: user.role },
      };
    });
  }

  findAll() {
    return this.prisma.staffProfile.findMany({ include: { user: true } });
  }

  async findOne(id: number) {
    const prof = await this.prisma.staffProfile.findUnique({
      where: { id },
      include: { user: true },
    });
    if (!prof) throw new NotFoundException(`Staff ${id} introuvable`);
    return prof;
  }

  async update(id: number, dto: UpdateStaffDto) {
    await this.findOne(id);
    return this.prisma.staffProfile.update({
      where: { id },
      data: { ...dto },
    });
  }

  async remove(id: number) {
    const count = await this.prisma.staffProfile.deleteMany({ where: { id } });
    if (count.count === 0) throw new NotFoundException(`Staff ${id} introuvable`);
    return { id };
  }
}
