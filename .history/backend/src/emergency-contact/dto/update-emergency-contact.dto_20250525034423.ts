// src/emergency-contact/dto/update-emergency-contact.dto.ts

import { IsOptional, IsString, MinLength, IsPhoneNumber } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateEmergencyContactDto {
  @IsOptional()
  @Transform(({ value }) => value?.trim())
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @Transform(({ value }) => value?.trim())
  @IsString()
  @MinLength(2)
  relation?: string;

  @IsOptional()
  @Transform(({ value }) => value?.trim())
  @IsPhoneNumber('FR')
  phone?: string;
}
