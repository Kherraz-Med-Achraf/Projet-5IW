import { OmitType, PartialType } from '@nestjs/mapped-types';
import { RegisterParentDto } from '../../auth/dto/register-parent.dto';

export class UpdateParentDto extends PartialType(
  OmitType(RegisterParentDto, [
    'children',
    'emergencyContacts',
    'email',
    'password',
    'passwordConfirm',
  ] as const),
) {}
