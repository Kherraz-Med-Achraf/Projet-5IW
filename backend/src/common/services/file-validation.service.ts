import { Injectable, BadRequestException } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class FileValidationService {
  private readonly ALLOWED_EXCEL_MIMES = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
  ];

  private readonly EXCEL_HEADERS = {
    xlsx: [0x50, 0x4B, 0x03, 0x04], // ZIP header (XLSX is a ZIP file)
    xls: [0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1], // OLE header
  };

  // 🔒 SÉCURITÉ: Types MIME autorisés pour les fichiers génériques
  private readonly ALLOWED_GENERAL_MIMES = [
    'image/jpeg',
    'image/png', 
    'image/webp',
    'image/gif',
    'video/mp4',
    'video/webm',
    'application/pdf'
  ];

  // 🔒 SÉCURITÉ: Headers binaires pour validation stricte
  private readonly FILE_SIGNATURES = {
    'image/jpeg': [[0xFF, 0xD8, 0xFF]],
    'image/png': [[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]],
    'image/webp': [[0x52, 0x49, 0x46, 0x46], [0x57, 0x45, 0x42, 0x50]], // RIFF...WEBP
    'image/gif': [[0x47, 0x49, 0x46, 0x38]], // GIF8
    'video/mp4': [[0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70], [0x66, 0x74, 0x79, 0x70]], // ftyp
    'video/webm': [[0x1A, 0x45, 0xDF, 0xA3]], // EBML
    'application/pdf': [[0x25, 0x50, 0x44, 0x46]] // %PDF
  };

  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  private readonly MIN_FILE_SIZE = 100; // 100 bytes minimum

  /**
   * Valide un fichier Excel de manière complète
   */
  validateExcelFile(file: Express.Multer.File): void {
    if (!file) {
      throw new BadRequestException('Fichier manquant');
    }

    // Validation de la taille
    this.validateFileSize(file);

    // Validation du type MIME
    this.validateMimeType(file);

    // Validation du header du fichier
    this.validateFileHeader(file);

    // Validation du nom de fichier
    this.validateFileName(file);

    // Validation spécifique des extensions Excel
    this.validateExcelExtension(file);

    // Scan antivirus basique (détection de patterns suspects)
    this.basicMalwareDetection(file);
  }

  private validateFileSize(file: Express.Multer.File): void {
    if (file.size > this.MAX_FILE_SIZE) {
      throw new BadRequestException(
        `Fichier trop volumineux. Taille maximale autorisée : ${this.MAX_FILE_SIZE / 1024 / 1024}MB`
      );
    }

    if (file.size < this.MIN_FILE_SIZE) {
      throw new BadRequestException('Fichier trop petit ou corrompu');
    }
  }

  private validateMimeType(file: Express.Multer.File): void {
    if (!this.ALLOWED_EXCEL_MIMES.includes(file.mimetype)) {
      throw new BadRequestException(
        `Type de fichier non autorisé: ${file.mimetype}. Types acceptés: ${this.ALLOWED_EXCEL_MIMES.join(', ')}`
      );
    }
  }

  private validateFileHeader(file: Express.Multer.File): void {
    const buffer = file.buffer;
    const isValidHeader = Object.values(this.EXCEL_HEADERS).some(signature =>
      signature.every((byte, index) => buffer[index] === byte)
    );

    if (!isValidHeader) {
      throw new BadRequestException('Header de fichier invalide ou corrompu');
    }
  }

  private validateFileName(file: Express.Multer.File): void {
    const filename = file.originalname;
    
    // Caractères interdits
    const dangerousChars = /[<>:"/\\|?*\x00-\x1f]/;
    if (dangerousChars.test(filename)) {
      throw new BadRequestException('Nom de fichier contient des caractères interdits');
    }

    // Longueur maximale
    if (filename.length > 255) {
      throw new BadRequestException('Nom de fichier trop long');
    }
  }

  private validateExcelExtension(file: Express.Multer.File): void {
    const filename = file.originalname.toLowerCase();
    const validExtensions = ['.xlsx', '.xls'];
    
    const hasValidExtension = validExtensions.some(ext => filename.endsWith(ext));
    if (!hasValidExtension) {
      throw new BadRequestException(
        `Extension de fichier non autorisée. Extensions acceptées: ${validExtensions.join(', ')}`
      );
    }
  }

  private basicMalwareDetection(file: Express.Multer.File): void {
    const buffer = file.buffer;
    const content = buffer.toString('utf8', 0, Math.min(1024, buffer.length));
    
    // Patterns suspects
    const suspiciousPatterns = [
      /<script/i,
      /javascript:/i,
      /vbscript:/i,
      /onload=/i,
      /onerror=/i,
      /eval\(/i,
      /document\.write/i,
      /\.exe\b/i,
      /\.scr\b/i,
      /\.bat\b/i,
      /\.cmd\b/i,
      /\.pif\b/i
    ];

    const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(content));
    if (isSuspicious) {
      throw new BadRequestException('Fichier suspect détecté');
    }
  }

  generateFileHash(file: Express.Multer.File): string {
    return crypto.createHash('sha256').update(file.buffer).digest('hex');
  }

  sanitizeFileName(filename: string): string {
    return filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  }

  /**
   * 🔒 VALIDATION SÉCURISÉE: Valide un fichier générique avec vérification MIME et binaire
   */
  validateFile(file: Express.Multer.File): void {
    if (!file) {
      throw new BadRequestException('Fichier manquant');
    }

    // Validation de la taille (5MB pour les fichiers génériques)
    const MAX_GENERAL_FILE_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_GENERAL_FILE_SIZE) {
      throw new BadRequestException(
        `Fichier trop volumineux. Taille maximale autorisée : ${MAX_GENERAL_FILE_SIZE / 1024 / 1024}MB`
      );
    }

    if (file.size < this.MIN_FILE_SIZE) {
      throw new BadRequestException('Fichier trop petit ou corrompu');
    }

    // 🔒 SÉCURITÉ: Validation stricte du type MIME
    if (!this.ALLOWED_GENERAL_MIMES.includes(file.mimetype)) {
      throw new BadRequestException(
        `Type de fichier non autorisé: ${file.mimetype}. Types acceptés: ${this.ALLOWED_GENERAL_MIMES.join(', ')}`
      );
    }

    // 🔒 SÉCURITÉ: Validation des headers binaires (protection contre contournement MIME)
    this.validateBinarySignature(file);

    // Validation du nom de fichier
    this.validateFileName(file);

    // 🔒 SÉCURITÉ: Validation de l'extension vs MIME
    this.validateExtensionMimeConsistency(file);

    // Scan antivirus basique
    this.basicMalwareDetection(file);

    // 🔒 SÉCURITÉ: Validation supplémentaire pour images
    if (file.mimetype.startsWith('image/')) {
      this.validateImageFile(file);
    }
  }

  /**
   * 🔒 SÉCURITÉ: Valide les headers binaires du fichier
   */
  private validateBinarySignature(file: Express.Multer.File): void {
    const buffer = file.buffer;
    const signatures = this.FILE_SIGNATURES[file.mimetype];
    
    if (!signatures) {
      throw new BadRequestException(`Type MIME non supporté pour validation binaire: ${file.mimetype}`);
    }

    const isValidSignature = signatures.some(signature => {
      if (signature.length === 2) {
        // Cas spécial pour WEBP (RIFF...WEBP)
        const riffMatch = signature[0].every((byte, index) => buffer[index] === byte);
        const webpMatch = signature[1].every((byte, index) => buffer[index + 8] === byte);
        return riffMatch && webpMatch;
      } else {
        // Validation normale
        return signature.every((byte, index) => buffer[index] === byte);
      }
    });

    if (!isValidSignature) {
      console.warn(`[SECURITY] Tentative d'upload de fichier avec signature binaire invalide: ${file.mimetype}`);
      throw new BadRequestException(
        `Header binaire invalide pour le type ${file.mimetype}. Le fichier ne correspond pas à son type déclaré.`
      );
    }
  }

  /**
   * 🔒 SÉCURITÉ: Valide la cohérence extension/MIME
   */
  private validateExtensionMimeConsistency(file: Express.Multer.File): void {
    const filename = file.originalname.toLowerCase();
    const mimetype = file.mimetype;

    const validCombinations = {
      '.jpg': ['image/jpeg'],
      '.jpeg': ['image/jpeg'],
      '.png': ['image/png'],
      '.webp': ['image/webp'],
      '.gif': ['image/gif'],
      '.mp4': ['video/mp4'],
      '.webm': ['video/webm'],
      '.pdf': ['application/pdf']
    };

    const extension = Object.keys(validCombinations).find(ext => filename.endsWith(ext));
    
    if (!extension) {
      throw new BadRequestException('Extension de fichier non autorisée');
    }

    if (!validCombinations[extension].includes(mimetype)) {
      console.warn(`[SECURITY] Incohérence extension/MIME: ${extension} vs ${mimetype}`);
      throw new BadRequestException(
        `Incohérence détectée: l'extension ${extension} ne correspond pas au type MIME ${mimetype}`
      );
    }
  }

  /**
   * 🔒 SÉCURITÉ: Validation supplémentaire pour les images
   */
  private validateImageFile(file: Express.Multer.File): void {
    const buffer = file.buffer;
    
    // Vérifier que l'image a des dimensions valides (pas juste un header)
    if (buffer.length < 100) {
      throw new BadRequestException('Fichier image trop petit pour être valide');
    }

    // Détecter les tentatives d'injection dans les métadonnées
    const content = buffer.toString('utf8', 0, Math.min(2048, buffer.length));
    const suspiciousImagePatterns = [
      /<\?php/i,
      /<%/i,
      /<script/i,
      /javascript:/i,
      /data:text\/html/i
    ];

    const hasSuspiciousContent = suspiciousImagePatterns.some(pattern => pattern.test(content));
    if (hasSuspiciousContent) {
      console.warn(`[SECURITY] Image avec contenu suspect détectée: ${file.originalname}`);
      throw new BadRequestException('Image avec contenu suspect détectée');
    }
  }

  generateSecureFilename(originalName: string, prefix: string = ''): string {
    const sanitized = this.sanitizeFileName(originalName);
    const timestamp = Date.now();
    const random = crypto.randomBytes(8).toString('hex');
    const extension = sanitized.substring(sanitized.lastIndexOf('.'));
    
    return `${prefix}${timestamp}-${random}${extension}`;
  }
}
