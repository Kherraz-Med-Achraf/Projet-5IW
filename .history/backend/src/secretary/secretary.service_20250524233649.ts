import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSecretaryDto } from './dto/create-secretary.dto';
import { UpdateSecretaryDto } from './dto/update-secretary.dto';

@Injectable()
export class SecretaryService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateSecretaryDto) {
    return this.prisma.secretaryProfile.create({
      data: {
        userId,
        jobTitle: dto.jobTitle,
        startDate: new Date(dto.startDate),
        profileImage: dto.profileImage,
      },
    });
  }

  async findAll() {
    return this.prisma.secretaryProfile.findMany({ include: { user: true } });
  }

  async findOne(id: number) {
    const sec = await this.prisma.secretaryProfile.findUnique({
      where: { id },
      include: { user: true },
    });
    if (!sec) throw new NotFoundException(`Secrétaire ${id} introuvable`);
    return sec;
  }

  async update(id: number, dto: UpdateSecretaryDto) {
    await this.findOne(id);
    return this.prisma.secretaryProfile.update({ where: { id }, data: { ...dto } });
  }

  async remove(id: number) {
    const count = await this.prisma.secretaryProfile.deleteMany({ where: { id } });
    if (count.count === 0) throw new NotFoundException(`Secrétaire ${id} introuvable`);
    return { id };
  }
}