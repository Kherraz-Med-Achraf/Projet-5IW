import { Injectable, BadRequestException } from '@nestjs/common';

@Injectable()
export class FileValidationService {
  private readonly MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
  
  // Magic numbers pour vérification du contenu réel des fichiers
  private readonly MAGIC_NUMBERS = {
    // Images
    'image/jpeg': [0xFF, 0xD8, 0xFF],
    'image/png': [0x89, 0x50, 0x4E, 0x47],
    'image/gif': [0x47, 0x49, 0x46],
    // Vidéos (premiers bytes du container)
    'video/mp4': [0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70], // ftyp
    'video/webm': [0x1A, 0x45, 0xDF, 0xA3], // EBML header
  };

  private readonly ALLOWED_EXTENSIONS = ['jpeg', 'jpg', 'png', 'gif', 'mp4', 'webm'];
  private readonly ALLOWED_MIME_TYPES = [
    'image/jpeg', 'image/png', 'image/gif',
    'video/mp4', 'video/webm'
  ];

  /**
   * Valider un fichier uploadé
   */
  validateFile(file: Express.Multer.File): void {
    // Vérifier la taille
    if (file.size > this.MAX_FILE_SIZE) {
      throw new BadRequestException('Fichier trop volumineux (maximum 50MB)');
    }

    // Vérifier l'extension
    const extension = this.getFileExtension(file.originalname);
    if (!this.ALLOWED_EXTENSIONS.includes(extension)) {
      throw new BadRequestException(`Extension non autorisée: ${extension}`);
    }

    // Vérifier le MIME type
    if (!this.ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(`Type MIME non autorisé: ${file.mimetype}`);
    }

    // Vérifier la cohérence extension/MIME type
    this.validateMimeTypeConsistency(extension, file.mimetype);

    // Vérifier les magic numbers
    this.validateMagicNumbers(file.buffer, file.mimetype);
  }

  /**
   * Extraire l'extension du fichier
   */
  private getFileExtension(filename: string): string {
    return filename.toLowerCase().split('.').pop() || '';
  }

  /**
   * Vérifier la cohérence entre extension et MIME type
   */
  private validateMimeTypeConsistency(extension: string, mimeType: string): void {
    const imageExtensions = ['jpeg', 'jpg', 'png', 'gif'];
    const videoExtensions = ['mp4', 'webm'];

    const isImageExtension = imageExtensions.includes(extension);
    const isVideoExtension = videoExtensions.includes(extension);
    const isImageMime = mimeType.startsWith('image/');
    const isVideoMime = mimeType.startsWith('video/');

    if ((isImageExtension && !isImageMime) || (isVideoExtension && !isVideoMime)) {
      throw new BadRequestException('Incohérence entre extension et type MIME');
    }
  }

  /**
   * Vérifier les magic numbers du fichier
   */
  private validateMagicNumbers(buffer: Buffer, mimeType: string): void {
    const magicNumbers = this.MAGIC_NUMBERS[mimeType];
    if (!magicNumbers) {
      throw new BadRequestException('Type de fichier non supporté pour validation');
    }

    // Pour les vidéos MP4, on vérifie juste les premiers bytes
    if (mimeType === 'video/mp4') {
      // Rechercher 'ftyp' dans les premiers 32 bytes
      const ftypPattern = Buffer.from('ftyp');
      const found = buffer.indexOf(ftypPattern, 0) !== -1 && buffer.indexOf(ftypPattern, 0) < 32;
      if (!found) {
        throw new BadRequestException('Fichier MP4 invalide');
      }
      return;
    }

    // Pour les autres formats, vérification stricte des magic numbers
    for (let i = 0; i < magicNumbers.length; i++) {
      if (buffer[i] !== magicNumbers[i]) {
        throw new BadRequestException(`Fichier corrompu ou type invalide`);
      }
    }
  }

  /**
   * Nettoyer le nom de fichier
   */
  sanitizeFilename(filename: string): string {
    // Supprimer les caractères dangereux et garder seulement alphanumériques + . -
    return filename.replace(/[^a-zA-Z0-9.-]/g, '_');
  }

  /**
   * Générer un nom de fichier sécurisé
   */
  generateSecureFilename(originalname: string): string {
    const extension = this.getFileExtension(originalname);
    const timestamp = Date.now();
    const random = Math.round(Math.random() * 1E9);
    return `${timestamp}-${random}.${extension}`;
  }
} 