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
  
  @ValidatorConstraint({ name: 'MinAge', async: false })
  class MinAgeConstraint implements ValidatorConstraintInterface {
    validate(birthDate: string, _args: ValidationArguments) {
      const bd = new Date(birthDate);
      if (isNaN(bd.getTime())) return false;
      const age = (Date.now() - bd.getTime()) / (1000 * 3600 * 24 * 365.25);
      return age >= 9;
    }
    defaultMessage(args: ValidationArguments) {
      return `La date de naissance doit indiquer un enfant âgé d'au moins 9 ans`;
    }
  }
  
  export class ChildDto {
    @IsString({ message: 'Le prénom doit être une chaîne de caractères' })
    @IsNotEmpty({ message: 'Le prénom est obligatoire' })
    @MinLength(2, { message: 'Le prénom doit contenir au moins 2 caractères' })
    firstName: string;
  
    @IsString({ message: 'Le nom doit être une chaîne de caractères' })
    @IsNotEmpty({ message: 'Le nom est obligatoire' })
    @MinLength(2, { message: 'Le nom doit contenir au moins 2 caractères' })
    lastName: string;
  
    @IsISO8601({ message: 'La date de naissance doit être une date ISO 8601 valide' })
    @Validate(MinAgeConstraint)
    birthDate: string;
  
    @IsOptional()
    @IsString({ message: 'La pathologie doit être une chaîne de caractères' })
    condition?: string;
  }
  