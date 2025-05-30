import {
    IsNotEmpty,
    IsPhoneNumber,
    IsString,
    MinLength,
  } from 'class-validator';
  
  export class EmergencyContactDto {
    /* Nom complet “Prénom Nom” concaténé côté front */
    @IsString({ message: 'Le nom complet doit être une chaîne de caractères' })
    @IsNotEmpty({ message: 'Le nom complet est obligatoire' })
    @MinLength(2, { message: 'Le nom complet doit contenir au moins 2 caractères' })
    name: string;
  
    /* Lien (Mère, Père, Frère / Sœur, etc.) ou “Autre: …” */
    @IsString({ message: 'Le lien doit être une chaîne de caractères' })
    @IsNotEmpty({ message: 'Le lien est obligatoire' })
    @MinLength(2, { message: 'Le lien doit contenir au moins 2 caractères' })
    relation: string;
  
    /* Numéro français obligatoire */
    @IsPhoneNumber('FR', { message: 'Le numéro de téléphone doit être un numéro français valide' })
    phone: string;
  }
  