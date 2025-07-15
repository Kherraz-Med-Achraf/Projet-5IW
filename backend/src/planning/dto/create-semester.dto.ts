// src/planning/dto/create-semester.dto.ts
import { IsString, IsNotEmpty, IsDateString, IsInt, Min } from 'class-validator';
import { Transform } from 'class-transformer';
import { IsCuid } from '../../common/decorators/is-cuid.decorator';

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
  @IsCuid({ message: 'semesterId doit être un CUID valide' })
  semesterId: string;
}

export class StaffParamsDto {
  @IsCuid({ message: 'semesterId doit être un CUID valide' })
  semesterId: string;

  @IsCuid({ message: 'staffId doit être un CUID valide' })
  staffId: string;
}

export class ChildParamsDto {
  @IsCuid({ message: 'semesterId doit être un CUID valide' })
  semesterId: string;

  @Transform(({ value }) => parseInt(value, 10))
  @IsInt({ message: 'childId doit être un nombre entier' })
  @Min(1, { message: 'childId doit être supérieur à 0' })
  childId: number;
}

export class EntryParamsDto {
  @IsCuid({ message: 'entryId doit être un CUID valide' })
  entryId: string;
}

export class ChildEntryParamsDto {
  @IsCuid({ message: 'entryId doit être un CUID valide' })
  entryId: string;

  @Transform(({ value }) => parseInt(value, 10))
  @IsInt({ message: 'childId doit être un nombre entier' })
  @Min(1, { message: 'childId doit être supérieur à 0' })
  childId: number;
}
