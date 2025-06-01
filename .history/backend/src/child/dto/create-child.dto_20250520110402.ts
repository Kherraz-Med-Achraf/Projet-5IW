// src/child/dto/create-child.dto.ts
import { IsEmail, IsString, IsInt, IsDateString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateChildProfileDto {
  @IsDateString()
  birthDate: string;

  @IsString()
  gender: string;
}

export class CreateChildDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;

  @IsInt()
  parentId: number;

  @ValidateNested()
  @Type(() => CreateChildProfileDto)
  profile: CreateChildProfileDto;
}
