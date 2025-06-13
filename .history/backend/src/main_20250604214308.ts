// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { join } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  // On précise qu'on utilise NestExpressApplication pour pouvoir servir des fichiers statiques
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Exposer le dossier "uploads" (à la racine du projet backend) sous la route "/uploads"
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads',
  });

  app.use(cookieParser());
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

  app.enableCors({
    origin: 'http://localhost:5173',
    credentials: true,
  });

  app.use(
    '/auth',
    rateLimit({
      windowMs: 60_000,
      max: 10,
      message: 'Trop de tentatives sur /auth, merci de réessayer dans 1 minute.',
    }),
  );

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
