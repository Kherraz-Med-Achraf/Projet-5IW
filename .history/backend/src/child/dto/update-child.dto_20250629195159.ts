import { IsOptional, IsString, IsDateString, IsInt, IsBoolean } from 'class-validator';

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
  @IsInt()
  parentProfileId?: number;

  @IsOptional()
  @IsBoolean()
  imageConsent?: boolean;
}
