import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateParentDto } from './dto/update-parent.dto';

@Injectable()
export class ParentService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const parents = await this.prisma.parentProfile.findMany({
      include: {
        user: true,
        emergencyContacts: true,
        children: true,
      },
    });

    return parents.map((profile) => ({
      id: profile.id,
      userId: profile.user.id,
      firstName: profile.firstName,
      lastName: profile.lastName,
      phone: profile.phone,
      address: profile.address,
      legalResponsibility: profile.legalResponsibility,
      emergencyContacts: profile.emergencyContacts || [],
      children: profile.children || [],
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
      user: { id: profile.user.id, email: profile.user.email, role: profile.user.role },
    }));
  }

  async findOne(id: number) {
    const parent = await this.prisma.parentProfile.findUnique({
      where: { id },
      include: {
        user: true,
        emergencyContacts: true,
        children: true,
      },
    });

    if (!parent) {
      throw new NotFoundException(`Parent ${id} introuvable`);
    }

    return {
      id: parent.id,
      userId: parent.user.id,
      firstName: parent.firstName,
      lastName: parent.lastName,
      phone: parent.phone,
      address: parent.address,
      legalResponsibility: parent.legalResponsibility,
      emergencyContacts: parent.emergencyContacts || [],
      children: parent.children || [],
      createdAt: parent.createdAt,
      updatedAt: parent.updatedAt,
      user: { id: parent.user.id, email: parent.user.email, role: parent.user.role },
    };
  }

  async update(id: number, dto: UpdateParentDto) {
    const profile = await this.prisma.parentProfile.findUnique({
      where: { id },
    });
    if (!profile) {
      throw new NotFoundException(`Profil parent ${id} introuvable`);
    }
    const newFirst = dto.firstName ?? profile.firstName;
    const newLast = dto.lastName ?? profile.lastName;
    const duplicate = await this.prisma.parentProfile.findFirst({
      where: {
        firstName: newFirst,
        lastName: newLast,
        id: { not: id },
      },
    });
    if (duplicate) {
      throw new BadRequestException(
        `Un parent "${newFirst} ${newLast}" existe déjà.`,
      );
    }
    return this.prisma.parentProfile.update({
      where: { id },
      data: { ...dto },
    });
  }

  async remove(id: number) {
    const parent = await this.prisma.parentProfile.findUnique({
      where: { id },
      select: { userId: true },
    });
    
    if (!parent) {
      throw new NotFoundException(`Parent ${id} introuvable`);
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.parentProfile.delete({
        where: { id },
      });
      
      await tx.user.delete({
        where: { id: parent.userId },
      });
      
      return { id };
    });
  }
}
