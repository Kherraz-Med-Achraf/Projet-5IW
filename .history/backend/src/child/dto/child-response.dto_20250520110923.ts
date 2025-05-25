export class ChildResponseDto {
    id: number;
    firstName: string;
    lastName: string;
    birthDate: string;          // renvoyé au format ISO
    condition?: string;
    parentProfileId: number;    // on peut aussi renommer en parentId si plus clair
  }
  