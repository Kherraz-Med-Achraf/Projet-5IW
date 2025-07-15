import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { v4 as uuidv4 } from 'uuid';
import { Role } from '@prisma/client';
import { FRONTEND_BASE_URL } from '../utils/frontend-url';

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
      throw new BadRequestException(
        'Une invitation valide existe déjà pour cet e-mail.',
      );
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

    const frontendUrl = FRONTEND_BASE_URL;
    const registrationLink = `${frontendUrl}/register?token=${token}`;
    const subject = 'Invitation à rejoindre la plateforme';
    const html = `
      <p>Bonjour,</p>
      <p>Vous avez été invité·e à créer un compte sur notre plateforme.</p>
      <p>Pour vous inscrire, cliquez sur le lien suivant :</p>
      <p><a href="${registrationLink}">${registrationLink}</a></p>
      <p>Ce lien est valable jusqu'au <strong>${invitation.expiresAt.toLocaleString()}</strong>.</p>
      <p>Si vous n'avez pas demandé cette invitation, ignorez simplement ce message.</p>
    `;
    
    console.log(`🔗 [INVITATION] Sending invitation email:`);
    console.log(`   To: ${email}`);
    console.log(`   Role: ${roleToAssign}`);
    console.log(`   Token: ${token}`);
    console.log(`   Registration link: ${registrationLink}`);
    console.log(`   Expires at: ${invitation.expiresAt.toLocaleString()}`);
    
    try {
      await this.mailService.sendMail(email, subject, html);
      console.log(`✅ [INVITATION] Email sent successfully to ${email}`);
    } catch (error) {
      console.error(`❌ [INVITATION] Failed to send email to ${email}:`, error);
      throw error;
    }

    return invitation;
  }

  /**
   * @param token
   */
  async validateToken(token: string) {
    const invitation = await this.prisma.invitation.findUnique({
      where: { token },
    });
    if (!invitation) {
      throw new NotFoundException('Invitation introuvable.');
    }
    if (invitation.used) {
      throw new BadRequestException("Ce lien d'invitation a déjà été utilisé.");
    }
    if (invitation.expiresAt < new Date()) {
      throw new BadRequestException("Ce lien d'invitation a expiré.");
    }
    return invitation;
  }

  /**
   * @param token  Le token d'invitation à marquer comme utilisé
   */
  async markAsUsed(token: string) {
    return this.prisma.invitation.update({
      where: { token },
      data: { used: true },
    });
  }

  async findAllInvitations(requestingUserId: string, requestingUserRole: Role) {
    if (requestingUserRole === Role.ADMIN) {
      return this.prisma.invitation.findMany({
        orderBy: { createdAt: 'desc' },
      });
    }
    return this.prisma.invitation.findMany({
      where: { invitedBy: requestingUserId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * @param token
   */
  async deleteInvitation(token: string) {
    return this.prisma.invitation.delete({ where: { token } });
  }
}