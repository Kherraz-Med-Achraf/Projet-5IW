import { IsObject, IsString } from 'class-validator';

/**
 * Payload minimal dont on a besoin depuis Yousign.
 * On capture tout le bloc en `raw` si nécessaire.
 */
export class YousignWebhookDto {
  /** ex. “procedure.member.finished” ou “procedure.finished” */
  @IsString()
  eventName: string;

  /** Données complètes brutes renvoyées par Yousign */
  @IsObject()
  payload: Record<string, any>;
}
