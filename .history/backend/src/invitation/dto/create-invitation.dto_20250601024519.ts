import { IsEmail, IsEnum, IsOptional, IsISO8601 } from 'class-validator';
import { Role } from '@prisma/client';

export class CreateInvitationDto {
  @IsEmail()
  email: string;

  @IsEnum(Role, { message: 'roleToAssign must be a valid Role' })
  roleToAssign: Role;

  /** ISO-8601 string, optionnelle. Si absente ⇒ +7 jours. */
  @IsOptional()
  @IsISO8601({}, { message: 'expiresAt must be an ISO date string' })
  expiresAt?: string;
}
