import { IsString, Matches } from 'class-validator';
import { PASSWORD_REGEX } from '../../common/constants/pasword.regex';

export class ChangePasswordDto {
  @IsString()
  currentPassword: string;

  @IsString()
  @Matches(PASSWORD_REGEX)
  newPassword: string;
} 