import { IsString, IsDateString, IsOptional, IsInt } from 'class-validator';

export class CreateChildDto {
  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsDateString()
  birthDate: string;    

  @IsOptional()
  @IsString()
  condition?: string;  

  @IsInt()
  parentProfileId: number;  
}
