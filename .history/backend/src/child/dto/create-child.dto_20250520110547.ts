import { IsString, IsDateString, IsOptional, IsInt } from 'class-validator';

export class CreateChildDto {
  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsDateString()
  birthDate: string;    // ISO 8601

  @IsOptional()
  @IsString()
  condition?: string;   // optionnel

  @IsInt()
  parentProfileId: number;  // FK vers ParentProfile
}
