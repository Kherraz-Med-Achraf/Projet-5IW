// src/secretary/dto/create-secretary.dto.ts
import { Transform } from 'class-transformer'
import {
  IsEmail, IsString, MinLength, Matches,
  IsDateString, IsOptional, IsUrl,
  IsPhoneNumber
} from 'class-validator'
import { PASSWORD_REGEX } from '../../common/constants/password.regex'

export class CreateSecretaryDto {
  @Transform(({ value }) => value?.trim().toLowerCase())
  @IsEmail() email: string

  @Transform(({ value }) => value?.trim())
  @IsString() @MinLength(12) @Matches(PASSWORD_REGEX)
  password: string

  @IsString() firstName: string
  @IsString() lastName: string
  @IsDateString() birthDate: string
  @IsPhoneNumber('FR') phone: string

  @IsString() jobTitle: string
  @IsDateString() startDate: string
  @IsOptional() @IsUrl() profileImage?: string
}
