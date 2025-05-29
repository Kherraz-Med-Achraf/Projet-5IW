// src/child/dto/create-child.dto.ts
import { IsString, IsDateString, IsOptional } from 'class-validator';

export class CreateChildDto {
  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsDateString()
  birthDate: string;
}
