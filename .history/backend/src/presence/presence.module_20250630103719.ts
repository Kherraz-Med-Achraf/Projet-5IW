import { Module, BadRequestException } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { PrismaModule } from '../prisma/prisma.module';
import { PresenceService } from './presence.service';
import { PresenceController } from './presence.controller';
import { PresenceCron } from './presence.cron';        
import * as multer from 'multer';
import * as path from 'path';
import * as crypto from 'crypto';

@Module({
  imports: [
    PrismaModule,
    MulterModule.register({
      storage: multer.diskStorage({
        destination: './uploads/justifications',
        filename: (req, file, cb) => {
          // Générer un nom de fichier sécurisé et unique
          const fileExtension = path.extname(file.originalname).toLowerCase();
          const secureFilename = `${crypto.randomUUID()}${fileExtension}`;
          cb(null, secureFilename);
        },
      }),
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB maximum
        files: 1, // 1 fichier maximum
      },
      fileFilter: (req, file, cb) => {
        // Validation du type MIME
        const allowedMimeTypes = [
          'application/pdf',
          'image/jpeg',
          'image/jpg', 
          'image/png',
          'image/webp'
        ];

        // Validation de l'extension
        const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.webp'];
        const fileExtension = path.extname(file.originalname).toLowerCase();

        // Double validation : MIME type ET extension
        if (allowedMimeTypes.includes(file.mimetype) && allowedExtensions.includes(fileExtension)) {
          // Validation du nom de fichier (pas de caractères dangereux)
          if (!/^[a-zA-Z0-9._-]+$/.test(file.originalname)) {
            cb(new BadRequestException('Nom de fichier contient des caractères non autorisés'), false);
            return;
          }
          
          cb(null, true);
        } else {
          cb(new BadRequestException(`Type de fichier non autorisé. Types acceptés: PDF, JPG, PNG, WebP`), false);
        }
      },
    }),
  ],
  controllers: [PresenceController],
  providers: [PresenceService, PresenceCron],            
})
export class PresenceModule {}
