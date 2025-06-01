import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateParentDto } from './dto/update-parent.dto';

@Injectable()
export class ParentService {
  constructor(private readonly prisma: PrismaService) {}

  async findOne(id: number) {
    const profile = await this.prisma.parentProfile.findUnique({
      where: { id },
      include: { user: true, emergencyContacts: true, children: true },
    });
    if (!profile) throw new NotFoundException(`Profil parent ${id} introuvable`);
    return profile;
  }

  async update(id: number, dto: UpdateParentDto) {
    const profile = await this.prisma.parentProfile.findUnique({ where: { id } });
    if (!profile) throw new NotFoundException(`Profil parent ${id} introuvable`);
    return this.prisma.parentProfile.update({
      where: { id },
      data: { ...dto },
    });
  }

  async remove(id: number) {
    const deleteCount = await this.prisma.parentProfile.deleteMany({ where: { id } });
    if (deleteCount.count === 0) throw new NotFoundException(`Profil parent ${id} introuvable`);
  
    return { id };
  }
}