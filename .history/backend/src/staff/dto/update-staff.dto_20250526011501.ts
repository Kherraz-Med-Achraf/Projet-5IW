import { IsOptional, IsEnum, IsString } from 'class-validator';
import { Discipline } from '@prisma/client';

export class UpdateStaffDto {
  @IsOptional()
  @IsEnum(Discipline, { message: 'Discipline invalide' })
  discipline?: Discipline;

  @IsOptional()
  @IsString({ message: 'La spécialité doit être une chaîne de caractères' })
  specialty?: string;
}
