import { IsEmail, IsEnum } from 'class-validator';
import { Transform } from 'class-transformer';
import { Role } from '@prisma/client';

export class CreateInvitationDto {
  @Transform(({ value }) => value?.trim().toLowerCase())
  @IsEmail()
  email: string;

  /** rôle attribué lors de l'inscription (PARENT uniquement pour l'instant) */
  @IsEnum(Role)
  roleToAssign: Role;
}
