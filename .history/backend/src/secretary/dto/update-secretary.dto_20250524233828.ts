import { IsString, IsDateString, IsOptional, IsUrl } from 'class-validator';

export class UpdateSecretaryDto {
  @IsOptional()
  @IsString()
  jobTitle?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsUrl()
  profileImage?: string;
}
