import { IsString, IsNotEmpty, MinLength, IsPhoneNumber } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateEmergencyContactDto {
  @Transform(({ value }) => value?.trim())
  @IsString() @IsNotEmpty() @MinLength(2)
  name: string;

  @Transform(({ value }) => value?.trim())
  @IsString() @IsNotEmpty() @MinLength(2)
  relation: string;

  @Transform(({ value }) => value?.trim())
  @IsPhoneNumber('FR', { strictMode: false }, { message: 'Numéro FR invalide' })
  phone: string;
}

// src/emergency-contact/dto/update-emergency-contact.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateEmergencyContactDto } from './create-emergency-contact.dto';

export class UpdateEmergencyContactDto extends PartialType(CreateEmergencyContactDto) {}
