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
        'Type de fichier non autorisé. Seuls les fichiers Excel (.xlsx, .xls) sont acceptés'
      );
    }
  }

  private validateFileHeader(file: Express.Multer.File): void {
    const buffer = file.buffer;
    const header = Array.from(buffer.slice(0, 8));

    const isValidXlsx = this.EXCEL_HEADERS.xlsx.every((byte, index) => 
      header[index] === byte
    );

    const isValidXls = this.EXCEL_HEADERS.xls.every((byte, index) => 
      header[index] === byte
    );

    if (!isValidXlsx && !isValidXls) {
      throw new BadRequestException(
        'Header de fichier invalide. Le fichier ne semble pas être un Excel valide'
      );
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
    const filename = file.originalname;
    
    // Extensions autorisées pour Excel
    const allowedExtensions = ['.xlsx', '.xls'];
    const extension = filename.toLowerCase().slice(filename.lastIndexOf('.'));
    
    if (!allowedExtensions.includes(extension)) {
      throw new BadRequestException('Extension de fichier non autorisée pour Excel. Seuls .xlsx et .xls sont acceptés');
    }
  }

  private basicMalwareDetection(file: Express.Multer.File): void {
    const buffer = file.buffer;
    const content = buffer.toString('utf-8', 0, Math.min(buffer.length, 1024));

    // Patterns suspects dans les fichiers Excel
    const suspiciousPatterns = [
      'javascript:',
      'vbscript:',
      'data:text/html',
      'data:application/javascript',
      '<script',
      'eval(',
      'document.write',
      'window.location',
      'ActiveXObject',
      'WScript.Shell',
      'cmd.exe',
      'powershell',
    ];

    for (const pattern of suspiciousPatterns) {
      if (content.toLowerCase().includes(pattern.toLowerCase())) {
        throw new BadRequestException(
          'Fichier suspect détecté. Contenu potentiellement malveillant'
        );
      }
    }
  }

  /**
   * Génère un hash sécurisé du fichier pour l'audit
   */
  generateFileHash(file: Express.Multer.File): string {
    return crypto.createHash('sha256').update(file.buffer).digest('hex');
  }

  /**
   * Valide et sanitise le nom de fichier
   */
  sanitizeFileName(filename: string): string {
    return filename
      .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
      .replace(/\.+/g, '.')
      .slice(0, 255);
  }

  /**
   * Valide un fichier générique (pour blog, documents, etc.)
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

    // Validation du nom de fichier
    this.validateFileName(file);

    // Scan antivirus basique
    this.basicMalwareDetection(file);
  }

  /**
   * Génère un nom de fichier sécurisé avec timestamp et hash
   */
  generateSecureFilename(originalName: string, prefix: string = ''): string {
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 15);
    const sanitizedName = this.sanitizeFileName(originalName);
    
    // Gestion des fichiers avec ou sans extension
    const lastDotIndex = sanitizedName.lastIndexOf('.');
    const extension = lastDotIndex > 0 ? sanitizedName.slice(lastDotIndex) : '';
    const nameWithoutExt = lastDotIndex > 0 ? sanitizedName.slice(0, lastDotIndex) : sanitizedName;
    
    return `${prefix}${timestamp}-${randomSuffix}-${nameWithoutExt}${extension}`;
  }
}
