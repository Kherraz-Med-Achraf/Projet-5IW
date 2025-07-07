// src/presence/presence.service.ts

import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JustifyAbsenceDto, JustificationType } from './dto/presence.dto';
import { Role } from '@prisma/client';

@Injectable()
export class PresenceService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Aplatit la feuille en gardant la structure child.parent.phone
   * Masque le téléphone selon le rôle utilisateur
   */
  private mapSheet(raw: any, userRole?: Role) {
    if (!raw) return null;

    return {
      id: raw.id,
      date: raw.date,
      status: raw.status,
      validatedAtStaff: raw.validatedAtStaff,
      validatedAtSecretary: raw.validatedAtSecretary,
      staff: raw.staff, // { staffProfile: { firstName, lastName } }
      records: raw.records.map((r: any) => ({
        id: r.id,
        childId: r.childId,
        present: r.present,
        justification: r.justification,
        child: {
          id: r.child.id,
          firstName: r.child.firstName,
          lastName: r.child.lastName,
          birthDate: r.child.birthDate,
          parentProfileId: r.child.parentProfileId,
          parent: r.child.parent ? { 
            phone: this.getPhoneBasedOnRole(r.child.parent.phone, userRole)
          } : undefined,
        },
      })),
    };
  }

  /**
   * Retourne le numéro de téléphone selon le rôle de l'utilisateur
   * SECRETARY, DIRECTOR, SERVICE_MANAGER : numéro complet
   * Autres rôles : numéro masqué
   */
  private getPhoneBasedOnRole(phone: string, userRole?: Role): string {
    if (!phone) return phone;
    
    const authorizedRoles: Role[] = [Role.SECRETARY, Role.DIRECTOR, Role.SERVICE_MANAGER];
    
    if (userRole && authorizedRoles.includes(userRole)) {
      return phone; // Numéro complet pour les rôles autorisés
    }
    
    // Numéro masqué pour les autres rôles
    return this.maskPhoneNumber(phone);
  }

  /**
   * Masque un numéro de téléphone pour la confidentialité
   */
  private maskPhoneNumber(phone: string): string {
    if (!phone || phone.length < 10) return phone;
    return phone.replace(/(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 ** ** $5');
  }

  /** 1. Créer ou récupérer la feuille du jour (STAFF) */
  async createSheet(dateString: string, staffId: string, userRole?: Role) {
    const date = new Date(dateString);

    // 1) Upsert de la feuille
    const sheetUpsert = await this.prisma.presenceSheet.upsert({
      where: { date },
      create: { date, staffId, status: 'PENDING_STAFF' },
      update: {},
    });

    // 2) Génération des records s'ils n'existent pas
    const exists = await this.prisma.presenceRecord.findFirst({
      where: { sheetId: sheetUpsert.id },
      select: { id: true },
    });
    if (!exists) {
      const children = await this.prisma.child.findMany();
      await this.prisma.presenceRecord.createMany({
        data: children.map(c => ({
          sheetId: sheetUpsert.id,
          childId: c.id,
          present: false,
        })),
      });
    }

    // 3) Lecture complète avec parent.phone
    const raw = (await this.prisma.presenceSheet.findUnique({
      where: { id: sheetUpsert.id },
      include: {
        records: {
          include: {
            child: {
              include: {
                parent: { select: { phone: true } },
              },
            },
            justification: true,
          },
        },
        staff: {
          select: {
            staffProfile: { select: { firstName: true, lastName: true } },
          },
        },
      },
    })) as any;

    return this.mapSheet(raw, userRole);
  }

  /** 2. Valider la feuille (STAFF) */
  async validateSheet(
    sheetId: number,
    presentChildIds: number[],
    staffId: string,
    userRole?: Role,
  ) {
    const sheet = await this.prisma.presenceSheet.findUnique({ where: { id: sheetId } });
    if (!sheet) throw new NotFoundException('Feuille introuvable');
    if (sheet.status !== 'PENDING_STAFF')
      throw new BadRequestException('Feuille non éligible à la validation');

    // Supprime puis recrée tous les records
    const children = await this.prisma.child.findMany();
    const presentSet = new Set(presentChildIds);
    await this.prisma.presenceRecord.deleteMany({ where: { sheetId } });
    await this.prisma.presenceRecord.createMany({
      data: children.map(ch => ({
        sheetId,
        childId: ch.id,
        present: presentSet.has(ch.id),
      })),
    });

    // Retourne le sheet mis à jour avec parent.phone
    const raw = (await this.prisma.presenceSheet.update({
      where: { id: sheetId },
      data: {
        staffId,
        validatedAtStaff: new Date(),
        status: 'PENDING_SECRETARY',
      },
      include: {
        records: {
          include: {
            child: {
              include: {
                parent: { select: { phone: true } },
              },
            },
            justification: true,
          },
        },
        staff: {
          select: {
            staffProfile: { select: { firstName: true, lastName: true } },
          },
        },
      },
    })) as any;

    return this.mapSheet(raw, userRole);
  }

  /** 3. Justifier une absence ou un retard (SECRETARY) */
  async justify(recordId: number, dto: JustifyAbsenceDto, filePath?: string, userRole?: Role) {
    const rec = await this.prisma.presenceRecord.findUnique({
      where: { id: recordId },
      include: { sheet: true },
    });
    if (!rec) throw new NotFoundException('Enregistrement introuvable');
    if (rec.present) throw new BadRequestException('Impossible de justifier un présent');

    const motifValue =
      dto.motif ?? (dto.type === JustificationType.LATENESS ? 'Retard justifié' : '');

    await this.prisma.absenceJustification.create({
      data: {
        recordId,
        type: dto.type,
        justificationDate: new Date(dto.justificationDate),
        motif: motifValue,
        filePath: filePath ?? null,
      },
    });

    // Si plus d'absences non justifiées → passe au statut VALIDATED
    const pending = await this.prisma.presenceRecord.count({
      where: {
        sheetId: rec.sheetId,
        present: false,
        justification: null,
      },
    });
    const updateData: any = { validatedBySecretary: pending === 0 };
    if (pending === 0) {
      updateData.validatedAtSecretary = new Date();
      updateData.status = 'VALIDATED';
    }

    const raw = (await this.prisma.presenceSheet.update({
      where: { id: rec.sheetId },
      data: updateData,
      include: {
        records: {
          include: {
            child: {
              include: {
                parent: { select: { phone: true } },
              },
            },
            justification: true,
          },
        },
        staff: {
          select: {
            staffProfile: { select: { firstName: true, lastName: true } },
          },
        },
      },
    })) as any;

    return this.mapSheet(raw, userRole);
  }

  /** 4. Lire la feuille par date (STAFF, SECRETARY…) */
  async findByDate(dateString: string, userRole?: Role) {
    const date = new Date(dateString);
    const raw = (await this.prisma.presenceSheet.findUnique({
      where: { date },
      include: {
        records: {
          include: {
            child: {
              include: {
                parent: { select: { phone: true } },
              },
            },
            justification: true,
          },
        },
        staff: {
          select: {
            staffProfile: { select: { firstName: true, lastName: true } },
          },
        },
      },
    })) as any;

    if (!raw)
      throw new NotFoundException(`Feuille non trouvée pour la date ${dateString}`);
    return this.mapSheet(raw, userRole);
  }
}
