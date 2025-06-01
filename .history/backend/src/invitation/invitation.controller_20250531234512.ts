import {
    Controller,
    Post,
    Body,
    Get,
    Param,
    Delete,
    UseGuards,
    Request,
    BadRequestException,
  } from '@nestjs/common';
  import { InvitationService } from './invitation.service';
  import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
  import { RolesGuard } from '../common/guards/roles.guard';
  import { Roles } from '../common/decorators/roles.decorator';
  import { Role } from '@prisma/client';
  
  /**
   * DTO pour la création d’une invitation.
   */
  class CreateInvitationDto {
    email: string;
    roleToAssign: Role;
    expiresAt: Date; // Date en format ISO à fournir depuis le front
  }
  
  @Controller('invitations')
  export class InvitationController {
    constructor(private readonly invitationService: InvitationService) {}
  
    /**
     * Crée et envoie une invitation.
     * Seuls les rôles SERVICE_MANAGER, DIRECTOR ou ADMIN peuvent appeler ce endpoint.
     */
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.SERVICE_MANAGER, Role.DIRECTOR, Role.ADMIN)
    @Post()
    async create(@Body() dto: CreateInvitationDto, @Request() req) {
      const inviterId = req.user.userId; // Populé par JwtStrategy
      return this.invitationService.createInvitation(
        dto.email,
        dto.roleToAssign,
        inviterId,
        new Date(dto.expiresAt),
      );
    }
  
    /**
     * Vérifie la validité d’un token d’invitation.
     * Route publique (aucun guard) : utilisée par le front pour valider /register?token=XYZ.
     */
    @Get('validate/:token')
    async validate(@Param('token') token: string) {
      const invitation = await this.invitationService.validateToken(token);
      return {
        email: invitation.email,
        roleToAssign: invitation.roleToAssign,
        expiresAt: invitation.expiresAt,
      };
    }
  
    /**
     * (Optionnel) Liste des invitations créées.
     * Seuls SERVICE_MANAGER, DIRECTOR ou ADMIN peuvent consulter leurs invitations.
     */
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.SERVICE_MANAGER, Role.DIRECTOR, Role.ADMIN)
    @Get()
    async findAll(@Request() req) {
      return this.invitationService.findAllInvitations(
        req.user.userId,
        req.user.role,
      );
    }
  
    /**
     * (Optionnel) Annule (supprime) une invitation.
     * Seuls SERVICE_MANAGER, DIRECTOR ou ADMIN peuvent l’appeler.
     */
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.SERVICE_MANAGER, Role.DIRECTOR, Role.ADMIN)
    @Delete(':token')
    async remove(@Param('token') token: string) {
      return this.invitationService.deleteInvitation(token);
    }
  }
  