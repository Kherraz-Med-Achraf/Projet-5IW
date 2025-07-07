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

  async findAll() {
    const profiles = await this.prisma.parentProfile.findMany({
      include: { user: true, emergencyContacts: true, children: true },
    });

    // Masquer les données sensibles pour la sécurité
    return profiles.map((profile) => ({
      ...profile,
      phone: this.maskPhoneNumber(profile.phone),
      emergencyContacts: profile.emergencyContacts.map((contact) => ({
        ...contact,
        phone: this.maskPhoneNumber(contact.phone),
      })),
    }));
  }

  async findOne(id: number) {
    const profile = await this.prisma.parentProfile.findUnique({
      where: { id },
      include: { user: true, emergencyContacts: true, children: true },
    });
    if (!profile) {
      throw new NotFoundException(`Profil parent ${id} introuvable`);
    }

    // Masquer les données sensibles pour la sécurité
    return {
      ...profile,
      phone: this.maskPhoneNumber(profile.phone),
      emergencyContacts: profile.emergencyContacts.map((contact) => ({
        ...contact,
        phone: this.maskPhoneNumber(contact.phone),
      })),
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
    // D'abord récupérer le profil pour avoir l'userId
    const parent = await this.prisma.parentProfile.findUnique({
      where: { id },
      select: { userId: true },
    });
    
    if (!parent) {
      throw new NotFoundException(`Profil parent ${id} introuvable`);
    }

    // Supprimer en transaction pour assurer la cohérence
    return this.prisma.$transaction(async (tx) => {
      // Supprimer le profil parent
      await tx.parentProfile.delete({
        where: { id },
      });
      
      // Supprimer l'utilisateur associé
      await tx.user.delete({
        where: { id: parent.userId },
      });
      
      return { id };
    });
  }
}
