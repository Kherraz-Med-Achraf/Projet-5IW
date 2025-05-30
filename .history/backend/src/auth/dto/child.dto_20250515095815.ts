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
  
  /* ───── Validateur custom : âge ≥ 9 ans ───── */
  @ValidatorConstraint({ name: 'MinAge', async: false })
  class MinAgeConstraint implements ValidatorConstraintInterface {
    validate(birthDate: string, _args: ValidationArguments) {
      const bd = new Date(birthDate);
      if (isNaN(bd.getTime())) return false;
      const age = (Date.now() - bd.getTime()) / (1000 * 3600 * 24 * 365.25);
      return age >= 9;
    }
    defaultMessage(args: ValidationArguments) {
      return `${args.property} : l’enfant doit avoir au moins 9 ans`;
    }
  }
  
  export class ChildDto {
    @IsString()
    @IsNotEmpty()
    @MinLength(2)
    firstName: string;
  
    @IsString()
    @IsNotEmpty()
    @MinLength(2)
    lastName: string;
  
    @IsISO8601()
    @Validate(MinAgeConstraint)
    birthDate: string;
  
    @IsOptional()
    @IsString()
    condition?: string;
  }
  