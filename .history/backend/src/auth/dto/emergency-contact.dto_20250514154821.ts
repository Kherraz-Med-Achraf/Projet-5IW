import { IsPhoneNumber, IsString, MinLength } from 'class-validator';

export class EmergencyContactDto {
  @IsString() @MinLength(2) name: string;
  @IsString() relation: string;
  @IsPhoneNumber('FR') phone: string;
}
