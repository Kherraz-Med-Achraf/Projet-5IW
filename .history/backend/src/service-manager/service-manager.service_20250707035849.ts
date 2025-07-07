import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateServiceManagerDto } from './dto/create-service-manager.dto';
import { UpdateServiceManagerDto } from './dto/update-service-manager.dto';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';

@Injectable()
export class ServiceManagerService {
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

  async create(dto: CreateServiceManagerDto) {
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

    const hashed = await bcrypt.hash(password, 10);
    return this.prisma.$transaction(async (tx) => {
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
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
        },
      };
    });
  }

  async findAll() {
    const profiles = await this.prisma.serviceManagerProfile.findMany({
      include: { user: true },
    });

    // Masquer les données sensibles pour la sécurité
    return profiles.map((profile) => ({
      ...profile,
      phone: this.maskPhoneNumber(profile.phone),
    }));
  }

  async findOne(id: number) {
    const profile = await this.prisma.serviceManagerProfile.findUnique({
      where: { id },
      include: { user: true },
    });
    if (!profile) {
      throw new NotFoundException(`Chef de service ${id} introuvable`);
    }

    // Masquer les données sensibles pour la sécurité
    return {
      ...profile,
      phone: this.maskPhoneNumber(profile.phone),
    };
  }

  async update(id: number, dto: UpdateServiceManagerDto) {
    await this.findOne(id);
    return this.prisma.serviceManagerProfile.update({
      where: { id },
      data: { ...dto },
    });
  }

  async remove(id: number) {
    // D'abord récupérer le profil pour avoir l'userId
    const serviceManager = await this.prisma.serviceManagerProfile.findUnique({
      where: { id },
      select: { userId: true },
    });
    
    if (!serviceManager) {
      throw new NotFoundException(`Chef de service ${id} introuvable`);
    }

    // Supprimer en transaction pour assurer la cohérence
    return this.prisma.$transaction(async (tx) => {
      // Supprimer le profil chef de service
      await tx.serviceManagerProfile.delete({
        where: { id },
      });
      
      // Supprimer l'utilisateur associé
      await tx.user.delete({
        where: { id: serviceManager.userId },
      });
      
      return { id };
    });
  }
}
