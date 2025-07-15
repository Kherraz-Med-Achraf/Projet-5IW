import { IsDateString, IsInt, IsNotEmpty, IsOptional, IsPositive, IsString, MaxLength, Min, ValidateIf } from 'class-validator';

export class CreateEventDto {
  @IsString() @IsNotEmpty() @MaxLength(100)
  title!: string;

  @IsOptional() @IsString() @MaxLength(500)
  description?: string;

  /** Date du samedi YYYY-MM-DD */
  @IsDateString()
  date!: string;

  /** HH:mm */
  @IsString()
  startTime!: string;
  @IsString()
  endTime!: string;

  /** Prix en euros */
  @IsPositive() @IsOptional()
  price: number = 0;

  @IsOptional() @IsInt() @Min(1)
  capacity?: number;
} 