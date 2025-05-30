import {
    IsNotEmpty,
    IsPhoneNumber,
    IsString,
    MinLength,
  } from 'class-validator';
  
  export class EmergencyContactDto {
    /* Nom complet “Prénom Nom” concaténé côté front */
    @IsString()
    @IsNotEmpty()
    @MinLength(2)
    name: string;
  
    /* Lien (Mère, Père, Frère / Sœur, etc.) ou “Autre: …” */
    @IsString()
    @IsNotEmpty()
    @MinLength(2)
    relation: string;
  
    /* Numéro français obligatoire */
    @IsPhoneNumber('FR')
    phone: string;
  }
  