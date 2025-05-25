// src/service-manager/dto/update-service-manager.dto.ts
import { IsOptional, IsString, MinLength, IsUrl, IsDateString } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateServiceManagerDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  jobTitle?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsUrl()
  profileImage?: string;

  @IsOptional()
  @Transform(({ value }) => value?.trim())
  @IsString()
  @MinLength(2)
  firstName?: string;

  @IsOptional()
  @Transform(({ value }) => value?.trim())
  @IsString()
  @MinLength(2)
  lastName?: string;

  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @IsOptional()
  @Transform(({ value }) => value?.trim())
  @IsString()
  @MinLength(10)
  phone?: string;
}
