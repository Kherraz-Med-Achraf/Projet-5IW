import {
    Controller, Post, Body, Get, Param, Delete, UseGuards, Req,
  } from '@nestjs/common';
  import { InvitationService } from './invitation.service';
  import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
  import { RolesGuard } from '../common/guards/roles.guard';
  import { Roles } from '../common/decorators/roles.decorator';
  import { Role } from '@prisma/client';
  import { addDays } from 'date-fns';
  import { CreateInvitationDto } from './dto/create-invitation.dto';
  
  @Controller('invitations')
  export class InvitationController {
    constructor(private readonly invitationService: InvitationService) {}
  
    /* ───── CRÉER UNE INVITATION ───── */
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.SERVICE_MANAGER, Role.DIRECTOR, Role.ADMIN)
    @Post()
    async create(@Body() dto: CreateInvitationDto, @Req() req: any) {
      const inviterId = req.user.id ?? req.user.userId;     // adapte à ton JwtStrategy
      const expiresAt = dto.expiresAt
        ? new Date(dto.expiresAt)
        : addDays(new Date(), 7);
  
      return this.invitationService.createInvitation(
        dto.email,
        dto.roleToAssign,
        inviterId,
        expiresAt,
      );
    }
  
    /* ───── VALIDER UN TOKEN ───── */
    @Get('validate/:token')
    async validate(@Param('token') token: string) {
      const inv = await this.invitationService.validateToken(token);
      return {
        email: inv.email,
        roleToAssign: inv.roleToAssign,
        expiresAt: inv.expiresAt,
      };
    }
  
    /* ───── LISTE & DELETE (inchangés) ───── */
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.SERVICE_MANAGER, Role.DIRECTOR, Role.ADMIN)
    @Get()
    findAll(@Req() req: any) {
      return this.invitationService.findAllInvitations(req.user.id, req.user.role);
    }
  
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.SERVICE_MANAGER, Role.DIRECTOR, Role.ADMIN)
    @Delete(':token')
    remove(@Param('token') token: string) {
      return this.invitationService.deleteInvitation(token);
    }
  }
  