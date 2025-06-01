import { PartialType } from '@nestjs/mapped-types';
import { CreateSecretaryDto } from './create-secretary.dto';

export class UpdateSecretaryDto extends PartialType(CreateSecretaryDto) {}