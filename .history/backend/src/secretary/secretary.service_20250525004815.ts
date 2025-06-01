// src/secretary/secretary.service.ts
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSecretaryDto } from './dto/create-secretary.dto';
import { UpdateSecretaryDto } from './dto/update-secretary.dto';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';

@Injectable()
export class SecretaryService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Crée simultanément le User (role SECRETARY) et son SecretaryProfile,
   * dans une transaction pour garantir l’intégrité.
   */
  async create(dto: CreateSecretaryDto) {
    const { email, password, jobTitle, startDate, profileImage } = dto;

    // 1) Vérification de l’unicité de l’email
    if (await this.prisma.user.findUnique({ where: { email } })) {
      throw new BadRequestException('Email déjà utilisé');
    }

    // 2) Hash du mot de passe
    const hashed = await bcrypt.hash(password, 10);

    // 3) Transaction Prisma
    return this.prisma.$transaction(async tx => {
      // a) Création du User
      const user = await tx.user.create({
        data: {
          email,
          password: hashed,
          role: Role.SECRETARY,
          emailVerified: true, // bypass de la vérif. e-mail si souhaité
        },
      });

      // b) Création du profil secrétaire lié
      const profile = await tx.secretaryProfile.create({
        data: {
          user: { connect: { id: user.id } },
          jobTitle,
          startDate: new Date(startDate),
          profileImage,
        },
      });

      // 4) Retour d’un objet fusionné avec l’essentiel
      return {
        id: profile.id,
        userId: user.id,
        jobTitle: profile.jobTitle,
        startDate: profile.startDate,
        profileImage: profile.profileImage,
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

  /** Récupère tous les profils, avec leur user */
  async findAll() {
    return this.prisma.secretaryProfile.findMany({
      include: { user: true },
    });
  }

  /** Récupère un profil par son ID */
  async findOne(id: number) {
    const sec = await this.prisma.secretaryProfile.findUnique({
      where: { id },
      include: { user: true },
    });
    if (!sec) throw new NotFoundException(`Secrétaire ${id} introuvable`);
    return sec;
  }

  /** Met à jour un profil secrétaire */
  async update(id: number, dto: UpdateSecretaryDto) {
    await this.findOne(id);
    return this.prisma.secretaryProfile.update({
      where: { id },
      data: { ...dto },
    });
  }

  /** Supprime un profil secrétaire (et cascade suprime le User) */
  async remove(id: number) {
    const count = await this.prisma.secretaryProfile.deleteMany({
      where: { id },
    });
    if (count.count === 0) {
      throw new NotFoundException(`Secrétaire ${id} introuvable`);
    }
    return { id };
  }
}
