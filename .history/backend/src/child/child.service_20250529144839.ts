// src/child/child.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { CreateChildDto } from './dto/create-child.dto';
import { UpdateChildDto } from './dto/update-child.dto';
import * as bcrypt from 'bcrypt';
import { Role, Child } from '@prisma/client';

@Injectable()
export class ChildService {
  constructor(
    public readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  async createForParent(parentProfileId: number, dto: CreateChildDto): Promise<Child> {
    const defaultPwd = process.env.CHILD_DEFAULT_PASSWORD || 'child1234';

    return this.prisma.$transaction(async tx => {
      // 0) Vérification doublon prénom+nom
      const existingDuplicate = await tx.child.findFirst({
        where: {
          firstName: dto.firstName,
          lastName: dto.lastName,
        },
      });
      if (existingDuplicate) {
        throw new BadRequestException(
          `Un enfant "${dto.firstName} ${dto.lastName}" existe déjà pour ce parent.`,
        );
      }

      // 1) Création du profil enfant
      const child = await tx.child.create({
        data: {
          firstName: dto.firstName,
          lastName: dto.lastName,
          birthDate: new Date(dto.birthDate),
          parent: { connect: { id: parentProfileId } },
        },
      });

      // 2) Préparer l'envoi d'email au parent
      const parentProfile = await tx.parentProfile.findUnique({
        where: { id: parentProfileId },
        include: { user: true },
      });
      const parentEmail = parentProfile?.user.email;

      // 3) Génération du login
      const base = `${child.firstName[0].toLowerCase()}${child.lastName.toLowerCase()}`;
      let login = base;
      let suffix = 1;
      while (await tx.user.findUnique({ where: { email: `${login}@kids.local` } })) {
        login = `${base}_${suffix++}`;
      }

      // 4) Hash du mot de passe
      const hashed = await bcrypt.hash(defaultPwd, 10);

      // 5) Création du User enfant
      await tx.user.create({
        data: {
          email: `${login}@kids.local`,
          password: hashed,
          role: Role.CHILD,
          emailVerified: true,
          childProfile: { connect: { id: child.id } },
        },
      });

      // 6) Envoi des identifiants au parent
      if (parentEmail) {
        await this.mailService.sendMail(
          parentEmail,
          `Identifiants pour ${child.firstName} ${child.lastName}`,
          `<p>Bonjour,</p>
           <p>Le compte de votre enfant <strong>${child.firstName} ${child.lastName}</strong> a été créé.</p>
           <p><strong>Login :</strong> ${login}@kids.local<br/>
              <strong>Mot de passe :</strong> ${defaultPwd}</p>`,
        );
      }

      return child;
    });
  }

  async findAllForParent(parentProfileId: number): Promise<Child[]> {
    return this.prisma.child.findMany({ where: { parentProfileId } });
  }

  async findOneForParent(parentProfileId: number, id: number): Promise<Child | null> {
    return this.prisma.child.findFirst({ where: { id, parentProfileId } });
  }

  /**
   * Met à jour un enfant pour un parent donné, en vérifiant doublon prénom+nom
   * et en adaptant le login si le nom/prénom change.
   */
  async updateForParent(
    parentProfileId: number,
    id: number,
    dto: UpdateChildDto,
  ): Promise<Child> {
    // 1) Vérification d'appartenance
    const existing = await this.prisma.child.findUnique({ where: { id } });
    if (!existing || existing.parentProfileId !== parentProfileId) {
      throw new NotFoundException(`Enfant ${id} introuvable`);
    }

    // 2) Déterminer nouveaux prénom & nom
    const newFirst = dto.firstName ?? existing.firstName;
    const newLast = dto.lastName ?? existing.lastName;

    // 3) Vérifier qu'aucun autre enfant du parent n'a déjà ce prénom+nom
    const duplicate = await this.prisma.child.findFirst({
      where: {
        parentProfileId,
        firstName: newFirst,
        lastName: newLast,
        id: { not: id },
      },
    });
    if (duplicate) {
      throw new BadRequestException(
        `Un autre enfant "${newFirst} ${newLast}" existe déjà pour ce parent.`,
      );
    }

    // 4) Transaction de mise à jour + éventuelle mise à jour du login
    const result = await this.prisma.$transaction(async tx => {
      const count = await tx.child.updateMany({
        where: { id, parentProfileId },
        data: {
          ...(dto.firstName && { firstName: dto.firstName }),
          ...(dto.lastName && { lastName: dto.lastName }),
          ...(dto.birthDate && { birthDate: new Date(dto.birthDate) }),
        },
      });
      if (count.count === 0) {
        throw new NotFoundException(`Enfant ${id} introuvable`);
      }

      const child = await tx.child.findUnique({ where: { id } });
      if (!child) {
        throw new NotFoundException(`Enfant ${id} introuvable après mise à jour`);
      }

      // Adapter le login si le prénom ou le nom a changé
      let loginChanged = false;
      let newLogin = '';
      if (dto.firstName || dto.lastName) {
        const base = `${child.firstName[0].toLowerCase()}${child.lastName.toLowerCase()}`;
        let login = base, suffix = 1;
        while (await tx.user.findUnique({ where: { email: `${login}@kids.local` } })) {
          login = `${base}_${suffix++}`;
        }
        await tx.user.updateMany({
          where: { childProfile: { id } },
          data: { email: `${login}@kids.local` },
        });
        loginChanged = true;
        newLogin = `${login}@kids.local`;
      }

      const parent = await tx.parentProfile.findUnique({
        where: { id: parentProfileId },
        include: { user: true },
      });
      const parentEmail = parent?.user.email;

      return { child, loginChanged, newLogin, parentEmail };
    });

    // 5) Envoi du mail si login modifié
    if (result.loginChanged && result.parentEmail) {
      await this.mailService.sendMail(
        result.parentEmail,
        `Mise à jour des identifiants pour ${result.child.firstName} ${result.child.lastName}`,
        `<p>Bonjour,</p>
         <p>Les informations de connexion de votre enfant <strong>${result.child.firstName} ${result.child.lastName}</strong> ont été mises à jour.</p>
         <p><strong>Nouveau login :</strong> ${result.newLogin}</p>`,
      );
    }

    return result.child;
  }

  async removeForParent(parentProfileId: number, id: number): Promise<{ id: number }> {
    const child = await this.prisma.child.findFirst({
      where: { id, parentProfileId },
      select: { id: true, userId: true, firstName: true, lastName: true },
    });
    if (!child) {
      throw new NotFoundException(`Enfant ${id} introuvable`);
    }

    await this.prisma.$transaction(async tx => {
      await tx.child.delete({ where: { id: child.id } });
      if (child.userId) {
        await tx.user.delete({ where: { id: child.userId } });
      }
    });

    const parent = await this.prisma.parentProfile.findUnique({
      where: { id: parentProfileId },
      include: { user: true },
    });
    const parentEmail = parent?.user.email;
    if (parentEmail) {
      await this.mailService.sendMail(
        parentEmail,
        `Suppression du compte de ${child.firstName} ${child.lastName}`,
        `<p>Bonjour,</p>
         <p>Le compte de votre enfant <strong>${child.firstName} ${child.lastName}</strong> a été supprimé.</p>`,
      );
    }

    return { id };
  }

  // --- Méthodes génériques pour staff / admin ---
  async findAll(): Promise<Child[]> {
    return this.prisma.child.findMany();
  }

  async findOne(id: number): Promise<Child | null> {
    return this.prisma.child.findUnique({ where: { id } });
  }

  async update(id: number, dto: UpdateChildDto): Promise<Child> {
    const count = await this.prisma.child.updateMany({
      where: { id },
      data: {
        ...(dto.firstName && { firstName: dto.firstName }),
        ...(dto.lastName && { lastName: dto.lastName }),
        ...(dto.birthDate && { birthDate: new Date(dto.birthDate) }),
      },
    });
    if (count.count === 0) {
      throw new NotFoundException(`Enfant ${id} introuvable`);
    }
    return this.prisma.child.findUniqueOrThrow({ where: { id } });
  }

  async remove(id: number): Promise<void> {
    const count = await this.prisma.child.deleteMany({ where: { id } });
    if (count.count === 0) {
      throw new NotFoundException(`Enfant ${id} introuvable`);
    }
  }
}
