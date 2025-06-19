// src/planning/dtos/upload-excel.dto.ts
import { IsString, IsNotEmpty } from 'class-validator';

export class UploadExcelDto {
  @IsString()
  @IsNotEmpty()
  semesterId: string;
}
