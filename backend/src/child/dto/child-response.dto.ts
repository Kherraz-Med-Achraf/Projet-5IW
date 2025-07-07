export class ChildResponseDto {
  id: number;
  firstName: string;
  lastName: string;
  birthDate: string;
  parentProfileId: number;
  parentPhone?: string;
  imageConsent: boolean; // Droit à l'image de l'enfant
}
