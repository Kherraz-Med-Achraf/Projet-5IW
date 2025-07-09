import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { PrismaModule } from '../prisma/prisma.module';
import { MailModule } from '../mail/mail.module';
import { DocumentService } from './document.service';
import { DocumentController } from './document.controller';
import { CsrfGuard } from '../common/guards/csrf.guard';
import * as multer from 'multer';

@Module({
  imports: [
    PrismaModule,
    MailModule,
    MulterModule.register({
      storage: multer.memoryStorage(), // Stockage en mémoire pour traitement avant sauvegarde
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB maximum
        files: 1, // 1 fichier maximum
      },
      fileFilter: (req, file, cb) => {
        // Validation stricte: seuls les PDFs sont acceptés
        if (file.mimetype === 'application/pdf') {
          // Validation supplémentaire du nom de fichier
          if (!/^[a-zA-Z0-9._\-\s()]+\.pdf$/i.test(file.originalname)) {
            cb(new Error('Nom de fichier invalide. Seuls les caractères alphanumériques, espaces, tirets, points et parenthèses sont autorisés.'), false);
            return;
          }
          cb(null, true);
        } else {
          cb(new Error('Seuls les fichiers PDF sont acceptés pour les documents.'), false);
        }
      },
    }),
  ],
  controllers: [DocumentController],
  providers: [DocumentService, CsrfGuard],
  exports: [DocumentService],
})
export class DocumentModule {} 