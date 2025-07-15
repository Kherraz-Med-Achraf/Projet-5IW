import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsEnum,
  IsArray,
  ArrayNotEmpty,
  ArrayUnique,
  ValidateIf,
  Validate,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

/**
 * Validateur personnalisé pour les dates de présence
 */
@ValidatorConstraint({ name: 'isValidPresenceDate', async: false })
export class IsValidPresenceDate implements ValidatorConstraintInterface {
  validate(dateString: string, args: ValidationArguments) {
    const date = new Date(dateString);
    const now = new Date();
    const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    const oneMonthFromNow = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());

    // Vérifier que c'est une date valide
    if (isNaN(date.getTime())) return false;
    
    // Limiter la plage : pas plus d'un an dans le passé, pas plus d'un mois dans le futur
    return date >= oneYearAgo && date <= oneMonthFromNow;
  }

  defaultMessage(args: ValidationArguments) {
    return 'La date doit être comprise entre un an dans le passé et un mois dans le futur';
  }
}

/**
 * Validateur personnalisé pour les dates de justification
 */
@ValidatorConstraint({ name: 'isValidJustificationDate', async: false })
export class IsValidJustificationDate implements ValidatorConstraintInterface {
  validate(dateString: string, args: ValidationArguments) {
    const date = new Date(dateString);
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());

    // Vérifier que c'est une date valide
    if (isNaN(date.getTime())) return false;
    
    // Les justifications peuvent être dans le passé (max 6 mois) ou aujourd'hui
    return date >= sixMonthsAgo && date <= now;
  }

  defaultMessage(args: ValidationArguments) {
    return "La date de justification doit être comprise entre 6 mois dans le passé et aujourd'hui";
  }
}

/**
 * Pour indiquer si la justification est une absence ou un retard.
 */
export enum JustificationType {
  ABSENCE = 'ABSENCE',
  LATENESS = 'LATENESS',
}

/**
 * DTO pour créer ou récupérer une feuille de présence.
 */
export class CreatePresenceSheetDto {
  @ApiProperty({ 
    description: 'Date de la feuille (YYYY-MM-DD)', 
    format: 'date',
    example: '2024-01-15'
  })
  @IsDateString({}, { message: 'Format de date invalide. Utilisez YYYY-MM-DD' })
  @Validate(IsValidPresenceDate)
  date: string;
}

/**
 * DTO pour valider la feuille par l'éducateur.
 * On ne passe plus le staffId ici (récupéré depuis req.user),
 * mais on fournit la liste des enfants présents.
 */
export class ValidateSheetDto {
  @ApiProperty({
    description: 'Tableau des IDs des enfants présents',
    type: [Number],
    example: [1, 2, 3]
  })
  @IsArray({ message: 'presentChildIds doit être un tableau' })
  @ArrayNotEmpty({ message: 'Au moins un enfant doit être sélectionné' })
  @ArrayUnique({ message: "Les IDs d'enfants doivent être uniques" })
  presentChildIds: number[];
}

/**
 * DTO pour justifier une absence ou un retard par la secrétaire.
 * - Si type = ABSENCE : motif et éventuel fichier obligatoires.
 * - Si type = LATENESS : motif et fichier non requis.
 */
export class JustifyAbsenceDto {
  @ApiProperty({
    description: 'Type de la justification : ABSENCE ou LATENESS',
    enum: Object.values(JustificationType),
    enumName: 'JustificationType',
    example: JustificationType.ABSENCE
  })
  @IsEnum(JustificationType, { message: 'Type doit être ABSENCE ou LATENESS' })
  type: JustificationType;

  @ApiProperty({ 
    description: 'Date du justificatif (YYYY-MM-DD)', 
    format: 'date',
    example: '2024-01-15'
  })
  @IsDateString({}, { message: 'Format de date invalide pour justificationDate' })
  @Validate(IsValidJustificationDate)
  justificationDate: string;

  @ApiProperty({
    description: 'Motif de l\'absence (obligatoire si ABSENCE, facultatif si LATENESS)',
    required: false,
    example: 'Certificat médical'
  })
  @ValidateIf(o => o.type === JustificationType.ABSENCE)
  @IsString({ message: 'Le motif doit être une chaîne de caractères' })
  @IsNotEmpty({ message: 'Le motif est obligatoire pour une absence' })
  @IsOptional()
  motif?: string;

  @ApiProperty({
    description: 'Fichier justificatif (PDF/JPG), requis uniquement pour ABSENCE',
    type: 'string',
    format: 'binary',
    required: false,
  })
  @ValidateIf(o => o.type === JustificationType.ABSENCE)
  @IsOptional()
  file?: any;
} 