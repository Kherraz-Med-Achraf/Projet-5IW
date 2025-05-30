import { IsISO8601, IsOptional, IsString } from 'class-validator';

export class ChildDto {
  @IsString() firstName: string;
  @IsString() lastName: string;
  @IsISO8601() birthDate: string;        // YYYY-MM-DD
  @IsOptional() @IsString() condition?: string;
}
