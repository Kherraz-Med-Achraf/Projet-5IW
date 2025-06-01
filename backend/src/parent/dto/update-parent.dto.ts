import {
    IsOptional,
    IsString,
    MinLength,
    Matches,
  } from 'class-validator';
  import { Transform } from 'class-transformer';
  
  export class UpdateParentDto {
    @IsOptional()
    @Transform(({ value }) => value?.trim())
    @IsString()
    @MinLength(2, { message: 'Le prénom doit contenir au moins 2 caractères' })
    firstName?: string;
  
    @IsOptional()
    @Transform(({ value }) => value?.trim())
    @IsString()
    @MinLength(2, { message: 'Le nom doit contenir au moins 2 caractères' })
    lastName?: string;
  
    @IsOptional()
    @Transform(({ value }) => value?.trim())
    @Matches(/^0[67]\d{8}$/, {
      message:
        'Le numéro de téléphone doit être un numéro français valide',
    })
    phone?: string;
  
    @IsOptional()
    @Transform(({ value }) => value?.trim())
    @IsString()
    @MinLength(5, { message: "L'adresse doit contenir au moins 5 caractères" })
    address?: string;
  
    @IsOptional()
    @Transform(({ value }) => value?.trim())
    @IsString()
    @MinLength(2, {
      message: 'La responsabilité légale doit contenir au moins 2 caractères',
    })
    legalResponsibility?: string;
    @IsOptional()
    notificationPrefs?: any;
  }
  