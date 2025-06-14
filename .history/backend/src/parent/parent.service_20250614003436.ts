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

  /* ------------------------------------------------- *
   *  Recherche légère pour l'autocomplete secrétaire
   * ------------------------------------------------- */
  async searchLight(query: string) {
    return this.prisma.parentProfile.findMany({
      where: {
        OR: [
          { firstName: { contains: query, mode: 'insensitive' } },
          { lastName: { contains: query, mode: 'insensitive' } },
        ],
      },
      select: { id: true, firstName: true, lastName: true },
      take: 10,
    });
  }

  /* ------------------- CRUD complet ------------------- */

  async findAll() {
    return this.prisma.parentProfile.findMany({
      include: { user: true, emergencyContacts: true, children: true },
    });
  }

  async findOne(id: number) {
    const profile = await this.prisma.parentProfile.findUnique({
      where: { id },
      include: { user: true, emergencyContacts: true, children: true },
    });
    if (!profile) {
      throw new NotFoundException(`Profil parent ${id} introuvable`);
    }
    return profile;
  }

  async update(id: number, dto: UpdateParentDto) {
    const profile = await this.prisma.parentProfile.findUnique({ where: { id } });
    if (!profile) {
      throw new NotFoundException(`Profil parent ${id} introuvable`);
    }

    const newFirst = dto.firstName ?? profile.firstName;
    const newLast  = dto.lastName  ?? profile.lastName;

    const duplicate = await this.prisma.parentProfile.findFirst({
      where: {
        firstName: newFirst,
        lastName:  newLast,
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
    const deleted = await this.prisma.parentProfile.deleteMany({ where: { id } });
    if (deleted.count === 0) {
      throw new NotFoundException(`Profil parent ${id} introuvable`);
    }
    return { id };
  }
}
