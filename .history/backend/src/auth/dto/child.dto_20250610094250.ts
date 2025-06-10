import { Transform } from 'class-transformer'
import {
  IsString,
  IsNotEmpty,
  MinLength,
  IsDateString,
} from 'class-validator'
import { IsAgeBetween } from '../../common/validators/age-between.validator'

export class ChildDto {
  @Transform(({ value }) => value?.trim())
  @IsString({ message: 'Le prénom doit être une chaîne de caractères' })
  @IsNotEmpty({ message: 'Le prénom est obligatoire' })
  @MinLength(2, { message: 'Le prénom doit contenir au moins 2 caractères' })
  firstName!: string

  @Transform(({ value }) => value?.trim())
  @IsString({ message: 'Le nom doit être une chaîne de caractères' })
  @IsNotEmpty({ message: 'Le nom est obligatoire' })
  @MinLength(2, { message: 'Le nom doit contenir au moins 2 caractères' })
  lastName!: string

  @Transform(({ value }) => value?.trim())
  @IsDateString({ message: 'La date de naissance doit être au format ISO (YYYY-MM-DD)' })
  @IsAgeBetween(9, 20, { message: 'L’âge doit être compris entre 9 et 20 ans' })
  birthDate!: string
}
