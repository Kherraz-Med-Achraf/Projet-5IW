import { IsEmail, IsEnum, IsOptional, IsDateString } from 'class-validator';
import { Role } from '@prisma/client';

export class CreateInvitationDto {
  @IsEmail()
  email: string;

  /** rôle qui sera attribué à la création de compte */
  @IsEnum(Role, { message: 'roleToAssign must be a valid Role' })
  roleToAssign: Role;

  /** date limite du lien (ISO 8601) — optionnelle, défaut = +7 jours */
  @IsOptional()
  @IsDateString({ strict: true }, { message: 'expiresAt must be an ISO date string' })
  expiresAt?: string; // ex : "2025-07-01T23:59:59.000Z"
}
