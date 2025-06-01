import { Expose } from 'class-transformer';

export class EmergencyContactResponseDto {
  @Expose()
  id: number;

  @Expose()
  name: string;

  @Expose()
  relation: string;

  @Expose()
  phone: string;
}
