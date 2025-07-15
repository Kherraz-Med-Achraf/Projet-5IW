import { IsOptional, IsString, IsDateString, IsInt } from 'class-validator';

export class UpdateChildDto {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @IsOptional()
  @IsString()
  condition?: string;

  @IsOptional()
  @IsInt()
  parentProfileId?: number;
}
