// src/child/child.service.ts
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
      while (await tx.user.findUnique({ where: { email: `${login}@kids.local` } })) {
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
    return this.prisma.child.findMany({
      where: { parentProfileId },
    });
  }

  async findOneForParent(parentProfileId: number, id: number) {
    return this.prisma.child.findFirst({
      where: { id, parentProfileId },
    });
  }

  async updateForParent(
    parentProfileId: number,
    id: number,
    dto: UpdateChildDto,
  ) {
    return this.prisma.$transaction(async tx => {
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

      const child = await tx.child.findUnique({ where: { id } });
      if (!child) {
        throw new NotFoundException(
          `Enfant ${id} introuvable après mise à jour`,
        );
      }

      // recalcul du login
      const base = `${child.firstName[0].toLowerCase()}${child.lastName.toLowerCase()}`;
      let login = base;
      let suffix = 1;
      while (
        await tx.user.findUnique({ where: { email: `${login}@kids.local` } })
      ) {
        login = `${base}_${suffix++}`;
      }

      // mise à jour de l'email du compte enfant
      await tx.user.updateMany({
        where: { childProfile: { id } },
        data: { email: `${login}@kids.local` },
      });

      return child;
    });
  }
async removeForParent(parentProfileId: number, id: number) {

    const exists = await this.prisma.child.findFirst({
      where: { id, parentProfileId },
      select: { id: true },
    });
    if (!exists) {
      throw new NotFoundException(`Enfant ${id} introuvable`);
    }
  
    return this.prisma.$transaction(async tx => {
 
      await tx.user.deleteMany({
        where: { childProfile: { id } },
      });
  
      // 3) Supprimer le profil enfant
      const result = await tx.child.deleteMany({
        where: { id, parentProfileId },
      });
      if (result.count === 0) {
        throw new NotFoundException(`Enfant ${id} introuvable`);
      }
  
      return { id };
    });
  }
  
  
  
  
}
