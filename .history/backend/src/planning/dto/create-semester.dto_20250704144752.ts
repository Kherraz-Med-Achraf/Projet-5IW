// src/planning/dto/create-semester.dto.ts
import { IsString, IsNotEmpty, IsDateString, IsUUID, IsInt, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateSemesterDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;
}

// DTOs pour validation des paramètres d'URL
export class SemesterParamsDto {
  @IsUUID('4', { message: 'semesterId doit être un UUID valide' })
  semesterId: string;
}

export class StaffParamsDto {
  @IsUUID('4', { message: 'semesterId doit être un UUID valide' })
  semesterId: string;

  @IsUUID('4', { message: 'staffId doit être un UUID valide' })
  staffId: string;
}

export class ChildParamsDto {
  @IsUUID('4', { message: 'semesterId doit être un UUID valide' })
  semesterId: string;

  @Transform(({ value }) => parseInt(value, 10))
  @IsInt({ message: 'childId doit être un nombre entier' })
  @Min(1, { message: 'childId doit être supérieur à 0' })
  childId: number;
}

export class EntryParamsDto {
  @IsUUID('4', { message: 'entryId doit être un UUID valide' })
  entryId: string;
}

export class ChildEntryParamsDto {
  @IsUUID('4', { message: 'entryId doit être un UUID valide' })
  entryId: string;

  @Transform(({ value }) => parseInt(value, 10))
  @IsInt({ message: 'childId doit être un nombre entier' })
  @Min(1, { message: 'childId doit être supérieur à 0' })
  childId: number;
}
