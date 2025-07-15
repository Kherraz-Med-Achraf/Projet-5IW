import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateEventDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
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
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      const num = parseFloat(value);
      return isNaN(num) ? 0 : num;
    }
    return value;
  })
  @IsPositive()
  @IsOptional()
  price: number = 0;

  @Transform(({ value }) => {
    if (typeof value === 'string') {
      const num = parseInt(value, 10);
      return isNaN(num) ? undefined : num;
    }
    return value;
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number;
}
