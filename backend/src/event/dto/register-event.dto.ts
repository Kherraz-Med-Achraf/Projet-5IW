import { IsArray, IsEnum, IsInt, IsNotEmpty, IsNumber, IsOptional, Min } from 'class-validator';
import { PaymentMethod } from '@prisma/client';

export class RegisterEventDto {
  @IsArray()
  @IsInt({ each: true })
  childIds!: number[];

  @IsEnum(PaymentMethod)
  paymentMethod!: PaymentMethod;
} 