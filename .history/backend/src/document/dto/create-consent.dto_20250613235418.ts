import { IsString, IsUUID, Length } from 'class-validator';

/**
 * Données envoyées en même temps que le fichier PDF
 * (multipart : champ JSON “data” + champ “file”).
 */
export class CreateConsentDto {
  /** Nom lisible du document, ex. “Consentement photos” */
  @IsString()
  @Length(2, 150)
  name: string;

  /** ID du parent cible (User.id avec rôle PARENT) */
  @IsUUID()
  parentId: string;
}
