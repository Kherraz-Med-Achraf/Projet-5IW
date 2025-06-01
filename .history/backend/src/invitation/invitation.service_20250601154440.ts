import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { v4 as uuidv4 } from 'uuid';
import { Role } from '@prisma/client';

@Injectable()
export class InvitationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  /**
   * @param email         
   * @param roleToAssign  
   * @param inviterId    
   * @param expiresAt     
   */
  async createInvitation(
    email: string,
    roleToAssign: Role,
    inviterId: string,
    expiresAt: Date,
  ) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      throw new BadRequestException('Cet e-mail est déjà enregistré.');
    }

    const existingInvite = await this.prisma.invitation.findFirst({
      where: {
        email,
        used: false,
        expiresAt: { gt: new Date() },
      },
    });
    if (existingInvite) {
      throw new BadRequestException('Une invitation valide existe déjà pour cet e-mail.');
    }
    const token = uuidv4();
    const invitation = await this.prisma.invitation.create({
      data: {
        email,
        token,
        roleToAssign,
        expiresAt,
        invitedBy: inviterId,
      },
    });

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const registrationLink = `${frontendUrl}/register?token=${token}`;
    const subject = 'Invitation à rejoindre la plateforme';
    const html = `
      <p>Bonjour,</p>
      <p>Vous avez été invité·e à créer un compte sur notre plateforme.</p>
      <p>Pour vous inscrire, cliquez sur le lien suivant :</p>
      <p><a href="${registrationLink}">${registrationLink}</a></p>
      <p>Ce lien est valable jusqu’au <strong>${invitation.expiresAt.toLocaleString()}</strong>.</p>
      <p>Si vous n’avez pas demandé cette invitation, ignorez simplement ce message.</p>
    `;
    await this.mailService.sendMail(email, subject, html);

    return invitation;
  }

  /**
   * Valide un token d’invitation : vérifie qu’il existe, qu’il n’est pas expiré et qu’il n’a pas été utilisé.
   * @param token  Le token d’invitation à vérifier
   */
  async validateToken(token: string) {
    const invitation = await this.prisma.invitation.findUnique({
      where: { token },
    });
    if (!invitation) {
      throw new NotFoundException('Invitation introuvable.');
    }
    if (invitation.used) {
      throw new BadRequestException('Ce lien d’invitation a déjà été utilisé.');
    }
    if (invitation.expiresAt < new Date()) {
      throw new BadRequestException('Ce lien d’invitation a expiré.');
    }
    return invitation;
  }

  /**
   * Marque une invitation comme utilisée, afin qu’elle ne puisse plus être réutilisée.
   * @param token  Le token d’invitation à marquer comme utilisé
   */
  async markAsUsed(token: string) {
    return this.prisma.invitation.update({
      where: { token },
      data: { used: true },
    });
  }

  /**
   * (Optionnel) Récupère la liste des invitations créées.
   * Si requestingUserRole === ADMIN, renvoie toutes les invitations.
   * Sinon, renvoie uniquement celles émises par requestingUserId.
   */
  async findAllInvitations(requestingUserId: string, requestingUserRole: Role) {
    if (requestingUserRole === Role.ADMIN) {
      return this.prisma.invitation.findMany({ orderBy: { createdAt: 'desc' } });
    }
    return this.prisma.invitation.findMany({
      where: { invitedBy: requestingUserId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * (Optionnel) Supprime (annule) une invitation non encore utilisée.
   * @param token  Le token d’invitation à supprimer
   */
  async deleteInvitation(token: string) {
    return this.prisma.invitation.delete({ where: { token } });
  }
}
