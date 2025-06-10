// src/main.ts

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { join } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  // On précise que l’app est de type NestExpressApplication
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Middleware pour parser les cookies
  app.use(cookieParser());

  // Validation globale (DTOs, class-validator)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // CORS autorisé depuis le front (http://localhost:5173)
  app.enableCors({
    origin: 'http://localhost:5173',
    credentials: true,
  });

  // Rate limiter sur les routes /auth (10 requêtes/minute max)
  app.use(
    '/auth',
    rateLimit({
      windowMs: 60_000, // 1 minute
      max: 10,
      message: 'Trop de tentatives sur /auth, merci de réessayer dans 1 minute.',
    }),
  );

  /**
   * Sert le dossier "uploads" situé à la racine du projet (process.cwd())
   * Accessible ensuite via les URLs préfixées "/uploads/"
   */
  const uploadsFolder = join(process.cwd(), 'uploads');
  app.useStaticAssets(uploadsFolder, {
    prefix: '/uploads/',
  });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
