import { IsArray, IsEnum, IsInt, ArrayMinSize } from 'class-validator';
import { PaymentMethod } from '@prisma/client';

export class RegisterEventDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  childIds!: number[];

  @IsEnum(PaymentMethod)
  paymentMethod!: PaymentMethod;
}
