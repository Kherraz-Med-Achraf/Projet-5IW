// src/emergency-contact/dto/update-emergency-contact.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateEmergencyContactDto } from './create-emergency-contact.dto';

export class UpdateEmergencyContactDto extends PartialType(CreateEmergencyContactDto) {}
