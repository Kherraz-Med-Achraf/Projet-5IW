// src/planning/dtos/schedule-entry.dto.ts
import { Type } from 'class-transformer';
import {
  IsString,
  IsISO8601,
  IsNumber,
  ValidateNested,
  IsArray,
} from 'class-validator';

class ChildDto {
  @IsNumber()
  id: number;

  @IsString()
  firstName: string;

  @IsString()
  lastName: string;
}

export class ScheduleEntryDto {
  @IsString()
  id: string;

  @IsString()
  staffId: string;

  @IsString()
  semesterId: string;

  @IsNumber()
  dayOfWeek: number;

  @IsISO8601()
  startTime: string;

  @IsISO8601()
  endTime: string;

  @IsString()
  activity: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChildDto)
  children: ChildDto[];
}
