import {
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

/**
 * Vérifie que l’enfant a au moins 9 ans.
 */
@ValidatorConstraint({ name: 'MinAge', async: false })
class MinAgeConstraint implements ValidatorConstraintInterface {
  validate(birthDate: string, _args: ValidationArguments) {
    const bd = new Date(birthDate);
    if (isNaN(bd.getTime())) return false;
    const age = (Date.now() - bd.getTime()) / (1000 * 3600 * 24 * 365.25);
    return age >= 9;
  }
  defaultMessage(_args: ValidationArguments) {
    return `L'âge doit être d'au moins 9 ans`;
  }
}

/**
 * Vérifie que l’enfant a au plus 20 ans.
 */
@ValidatorConstraint({ name: 'MaxAge', async: false })
class MaxAgeConstraint implements ValidatorConstraintInterface {
  validate(birthDate: string, _args: ValidationArguments) {
    const bd = new Date(birthDate);
    if (isNaN(bd.getTime())) return false;
    const age = (Date.now() - bd.getTime()) / (1000 * 3600 * 24 * 365.25);
    return age <= 20;
  }
  defaultMessage(_args: ValidationArguments) {
    return `L'âge ne doit pas dépasser 20 ans`;
  }
}

export class ChildDto {
  @IsString({ message: 'Le prénom doit être une chaîne de caractères' })
  @IsNotEmpty({ message: 'Le prénom est obligatoire' })
  @MinLength(2, { message: 'Le prénom doit contenir au moins 2 caractères' })
  firstName!: string;

  @IsString({ message: 'Le nom doit être une chaîne de caractères' })
  @IsNotEmpty({ message: 'Le nom est obligatoire' })
  @MinLength(2, { message: 'Le nom doit contenir au moins 2 caractères' })
  lastName!: string;

  @IsISO8601(
    {},
    { message: 'La date de naissance doit être au format ISO (YYYY-MM-DD)' },
  )
  @Validate(MinAgeConstraint)
  @Validate(MaxAgeConstraint)
  birthDate!: string;

  @IsOptional()
  @IsString({ message: 'La pathologie doit être une chaîne de caractères' })
  condition?: string;
}
