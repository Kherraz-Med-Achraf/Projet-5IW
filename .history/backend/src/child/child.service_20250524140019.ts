import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { CreateChildDto } from './dto/create-child.dto';
import { UpdateChildDto } from './dto/update-child.dto';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';

@Injectable()
export class ChildService {
  constructor(
    public readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  async createForParent(parentProfileId: number, dto: CreateChildDto) {
    const defaultPwd = process.env.CHILD_DEFAULT_PASSWORD || 'child1234';

    return this.prisma.$transaction(async tx => {
      // 1) Création du profil enfant
      const child = await tx.child.create({
        data: {
          firstName: dto.firstName,
          lastName: dto.lastName,
          birthDate: new Date(dto.birthDate),
          condition: dto.condition,
          parent: { connect: { id: parentProfileId } },
        },
      });

      // 2) Récupérer l'email du parent
      const parentProfile = await tx.parentProfile.findUnique({
        where: { id: parentProfileId },
        include: { user: true },
      });
      const parentEmail = parentProfile?.user.email;

      // 3) Génération du login (initiale + nom) avec suffixe si collision
      const base = `${child.firstName[0].toLowerCase()}${child.lastName.toLowerCase()}`;
      let login = base;
      let suffix = 1;
      while (
        await tx.user.findUnique({ where: { email: `${login}@kids.local` } })
      ) {
        login = `${base}_${suffix++}`;
      }

      // 4) Hash du mot de passe
      const hashed = await bcrypt.hash(defaultPwd, 10);

      // 5) Création du compte User enfant lié
      await tx.user.create({
        data: {
          email: `${login}@kids.local`,
          password: hashed,
          role: Role.CHILD,
          emailVerified: true,
          childProfile: { connect: { id: child.id } },
        },
      });

      // 6) Envoi des identifiants par e-mail au parent
      if (parentEmail) {
        const subject = `Identifiants pour ${child.firstName} ${child.lastName}`;
        const html = `
          <p>Bonjour,</p>
          <p>Le compte de votre enfant <strong>${child.firstName} ${child.lastName}</strong> a été créé.</p>
          <p><strong>Login :</strong> ${login}@kids.local<br/>
             <strong>Mot de passe :</strong> ${defaultPwd}</p>
          <p>Vous pouvez modifier ce mot de passe ultérieurement.</p>
        `;
        await this.mailService.sendMail(parentEmail, subject, html);
      }

      return child;
    });
  }

  async findAllForParent(parentProfileId: number) {
    return this.prisma.child.findMany({ where: { parentProfileId } });
  }

  async findOneForParent(parentProfileId: number, id: number) {
    return this.prisma.child.findFirst({ where: { id, parentProfileId } });
  }

  async updateForParent(
    parentProfileId: number,
    id: number,
    dto: UpdateChildDto,
  ) {
    // récupération préalable pour savoir si prénom ou nom change
    const existing = await this.prisma.child.findUnique({ where: { id } });
    if (!existing || existing.parentProfileId !== parentProfileId) {
      throw new NotFoundException(`Enfant ${id} introuvable`);
    }

    const result = await this.prisma.$transaction(async tx => {
      const updateCount = await tx.child.updateMany({
        where: { id, parentProfileId },
        data: {
          ...(dto.firstName && { firstName: dto.firstName }),
          ...(dto.lastName && { lastName: dto.lastName }),
          ...(dto.birthDate && { birthDate: new Date(dto.birthDate) }),
          ...(dto.condition !== undefined && { condition: dto.condition }),
        },
      });
      if (updateCount.count === 0) {
        throw new NotFoundException(`Enfant ${id} introuvable`);
      }

      // fetch updated
      const child = await tx.child.findUnique({ where: { id } });
      if (!child) {
        throw new NotFoundException(
          `Enfant ${id} introuvable après mise à jour`,
        );
      }

      let loginChanged = false;
      let newLogin = '';
      if (dto.firstName || dto.lastName) {
        // recalcul du login
        const base = `${child.firstName[0].toLowerCase()}${child.lastName.toLowerCase()}`;
        let login = base;
        let suffix = 1;
        while (
          await tx.user.findUnique({ where: { email: `${login}@kids.local` } })
        ) {
          login = `${base}_${suffix++}`;
        }
        await tx.user.updateMany({
          where: { childProfile: { id } },
          data: { email: `${login}@kids.local` },
        });
        loginChanged = true;
        newLogin = `${login}@kids.local`;
      }

      // récupération email parent pour envoi
      let parentEmail: string | undefined;
      if (loginChanged) {
        const parentProfile = await tx.parentProfile.findUnique({
          where: { id: parentProfileId },
          include: { user: true },
        });
        parentEmail = parentProfile?.user.email;
      }

      return { child, loginChanged, newLogin, parentEmail };
    });

    // envoi mail post-transaction
    if (result.loginChanged && result.parentEmail) {
      const subject = `Mise à jour des identifiants pour ${result.child.firstName} ${result.child.lastName}`;
      const html = `
        <p>Bonjour,</p>
        <p>Les informations de connexion de votre enfant <strong>${result.child.firstName} ${result.child.lastName}</strong> ont été mises à jour.</p>
        <p><strong>Nouveau login :</strong> ${result.newLogin}</p>
      `;
      await this.mailService.sendMail(result.parentEmail, subject, html);
    }

    return result.child;
  }

  async removeForParent(parentProfileId: number, id: number) {
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

    // 3) Envoi d'un e-mail de notification de suppression
    const parentProfile = await this.prisma.parentProfile.findUnique({
      where: { id: parentProfileId },
      include: { user: true },
    });
    const parentEmail = parentProfile?.user.email;
    if (parentEmail) {
      const subject = `Suppression du compte de ${child.firstName} ${child.lastName}`;
      const html = `
        <p>Bonjour,</p>
        <p>Le compte de votre enfant <strong>${child.firstName} ${child.lastName}</strong> a été supprimé.</p>
      `;
      await this.mailService.sendMail(parentEmail, subject, html);
    }

    return { id };
  }
  }
}


