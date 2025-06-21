// src/planning/dtos/create-semester.dto.ts
import { IsString, IsNotEmpty, IsDateString } from 'class-validator';

export class CreateSemesterDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;
}
