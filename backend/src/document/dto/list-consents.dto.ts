import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ConsentStatus } from '@prisma/client';

/**
 * Query-params pour GET /documents/consents/secretary
 * et GET /documents/consents/parent
 */
export class ListConsentsDto {
  @IsOptional()
  @IsEnum(ConsentStatus)
  status?: ConsentStatus;          // filtre sur le statut

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;                // pagination

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit: number = 20;              // items / page
}
