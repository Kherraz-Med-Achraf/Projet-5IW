// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { join } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  // ────────────────────────────── Création de l’app ─────────────────────────────
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // ───────────────────────────── Middlewares globaux ────────────────────────────
  app.use(cookieParser());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist:            true,
      forbidNonWhitelisted: true,
      transform:            true,
      transformOptions:     { enableImplicitConversion: true },
    }),
  );

  app.enableCors({
    origin:       'http://localhost:5173',
    credentials:  true,
  });

  // Limite brute-force sur /auth
  app.use(
    '/auth',
    rateLimit({
      windowMs: 60_000,       // 1 min
      max:      10,
      message:  'Trop de tentatives sur /auth, réessayez dans 1 minute.',
    }),
  );

  // ───────────────────────────── Fichiers statiques ─────────────────────────────
  const uploadsFolder = join(process.cwd(), 'uploads');
  app.useStaticAssets(uploadsFolder, { prefix: '/uploads/' });

  // ───────────────────────────── DEBUG YOUSIGN ──────────────────────────────────
  const { YOUSIGN_API_URL, YOUSIGN_API_KEY } = process.env;
  console.log('[YOUSIGN CONFIG]', {
    url: YOUSIGN_API_URL || '(non défini)',
    key: YOUSIGN_API_KEY ? `${YOUSIGN_API_KEY.slice(0, 6)}…` : '(non défini)',
  });
  // ──────────────────────────────────────────────────────────────────────────────

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
