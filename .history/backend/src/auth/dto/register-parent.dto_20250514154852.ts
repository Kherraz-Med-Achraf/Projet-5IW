import {
    ArrayMinSize,
    IsEmail,
    IsOptional,
    IsPhoneNumber,
    IsString,
    Matches,
    MinLength,
    ValidateNested,
  } from 'class-validator';
  import { Transform, Type } from 'class-transformer';
  import { ChildDto } from './child.dto';
  import { EmergencyContactDto } from './emergency-contact.dto';
  import { Match } from '../../common/decorators/match.decorator';
  import { PASSWORD_REGEX } from '../../common
  
  export class RegisterParentDto {
    /* Étape 1 – Parent */
    @Transform(({ value }) => value?.trim())
    @IsString() firstName: string;
  
    @Transform(({ value }) => value?.trim())
    @IsString() lastName: string;
  
    @Transform(({ value }) => value?.trim())
    @IsPhoneNumber('FR') phone: string;
  
    @Transform(({ value }) => value?.trim())
    @IsString() address: string;
  
    @Transform(({ value }) => value?.trim())
    @IsString() legalResponsibility: string;
  
    @ValidateNested({ each: true })
    @Type(() => EmergencyContactDto)
    @ArrayMinSize(1) emergencyContacts: EmergencyContactDto[];
  
    /* Étape 2 – Enfant(s) */
    @ValidateNested({ each: true })
    @Type(() => ChildDto)
    @ArrayMinSize(1) children: ChildDto[];
  
    /* Étape 3 – Compte */
    @Transform(({ value }) => value?.trim().toLowerCase())
    @IsEmail() email: string;
  
    @Transform(({ value }) => value?.trim())
    @IsString() @MinLength(12) @Matches(PASSWORD_REGEX) password: string;
  
    @Transform(({ value }) => value?.trim())
    @IsString() @Match('password') passwordConfirm: string;
  
    @IsOptional() notificationPrefs?: any;
  }
  