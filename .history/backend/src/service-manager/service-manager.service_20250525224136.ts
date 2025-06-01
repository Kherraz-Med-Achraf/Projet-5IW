// src/service-manager/service-manager.service.ts
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateServiceManagerDto } from './dto/create-service-manager.dto';
import { UpdateServiceManagerDto } from './dto/update-service-manager.dto';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';

@Injectable()
export class ServiceManagerService {
  constructor(private readonly prisma: PrismaService) {}

  /** Crée User + ServiceManagerProfile en transaction */
  async create(dto: CreateServiceManagerDto) {
    const {
      email, password,
      jobTitle, startDate, profileImage,
      firstName, lastName, birthDate, phone,
    } = dto;

    if (await this.prisma.user.findUnique({ where: { email } })) {
      throw new BadRequestException('Email déjà utilisé');
    }
    const hashed = await bcrypt.hash(password, 10);

    return this.prisma.$transaction(async tx => {
      const user = await tx.user.create({
        data: {
          email,
          password: hashed,
          role: Role.SERVICE_MANAGER,
          emailVerified: true,
        },
      });
      const profile = await tx.serviceManagerProfile.create({
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

  /** GET /service-managers */
  async findAll() {
    return this.prisma.serviceManagerProfile.findMany({ include: { user: true } });
  }

  /** GET /service-managers/:id */
  async findOne(id: number) {
    const sec = await this.prisma.serviceManagerProfile.findUnique({
      where: { id },
      include: { user: true },
    });
    if (!sec) throw new NotFoundException(`Chef de service ${id} introuvable`);
    return sec;
  }

  /** PATCH /service-managers/:id */
  async update(id: number, dto: UpdateServiceManagerDto) {
    await this.findOne(id);
    return this.prisma.serviceManagerProfile.update({
      where: { id },
      data: { ...dto },
    });
  }

  /** DELETE /service-managers/:id (cascade supprime User) */
  async remove(id: number) {
    const count = await this.prisma.serviceManagerProfile.deleteMany({ where: { id } });
    if (count.count === 0) {
      throw new NotFoundException(`Chef de service ${id} introuvable`);
    }
    return { id };
  }
}
