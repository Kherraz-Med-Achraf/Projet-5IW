import { IsString, IsObject } from 'class-validator';

/**
 * DTO reçu depuis le webhook Yousign.
 * !! IL DOIT ABSOLUMENT CONTENIR UN MOT-CLÉ `export` !!
 */
export class YousignWebhookDto {
  /** ex. "procedure.member.finished" */
  @IsString()
  eventName: string;

  /** payload complet envoyé par Yousign */
  @IsObject()
  payload: Record<string, any>;
}
