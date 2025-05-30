import { IsString, IsDateString, IsOptional, IsUrl } from 'class-validator';

export class CreateSecretaryDto {
  @IsString()
  jobTitle: string;

  @IsDateString()
  startDate: string;

  @IsOptional()
  @IsUrl()
  profileImage?: string;
}