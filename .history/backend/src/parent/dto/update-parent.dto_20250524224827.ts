mport { IsOptional, IsString, MinLength, IsPhoneNumber } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateParentDto {
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
  @Transform(({ value }) => value?.trim())
  @IsPhoneNumber('FR')
  phone?: string;

  @IsOptional()
  @Transform(({ value }) => value?.trim())
  @IsString()
  @MinLength(5)
  address?: string;

  @IsOptional()
  @Transform(({ value }) => value?.trim())
  @IsString()
  legalResponsibility?: string;

  // notificationPrefs if needed
  @IsOptional()
  notificationPrefs?: any;
}
