// src/main.ts

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { join } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';

async function bootstrap() {
  // On précise que l'app est de type NestExpressApplication
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Configuration des headers de sécurité avec Helmet (CSP stricte)
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"], // Suppression d'unsafe-inline et unsafe-eval
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"], // CSS nécessaire pour Vue
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "blob:", "http://localhost:3000", "http://localhost:5173"],
        connectSrc: ["'self'", "http://localhost:3000", "ws:", "wss:"], // WebSocket pour le chat
        mediaSrc: ["'self'", "blob:"],
        objectSrc: ["'none'"],
        frameSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        upgradeInsecureRequests: [],
        childSrc: ["'none'"], // Aucun iframe/worker autorisé
        manifestSrc: ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
    // Ajout de headers de sécurité supplémentaires
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    },
    noSniff: true,
    xssFilter: true,
    referrerPolicy: { policy: "strict-origin-when-cross-origin" }
  }));

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

  // Rate limiter sur les routes /events (100 requêtes/15min max)
  app.use(
    '/events',
    rateLimit({
      windowMs: 15 * 60_000, // 15 minutes
      max: 100,
      message: 'Trop de requêtes sur /events, merci de réessayer plus tard.',
    }),
  );

  // Rate limiter spécifique sur la route /auth/refresh (5 requêtes / min)
  app.use(
    '/auth/refresh',
    rateLimit({
      windowMs: 60_000,
      max: 5,
      message: 'Trop de requêtes sur /auth/refresh, merci de réessayer dans 1 minute.',
    }),
  );

  // Rate limiter sur les routes /journal (50 requêtes/15min max)
  app.use(
    '/journal',
    rateLimit({
      windowMs: 15 * 60_000, // 15 minutes
      max: 50,
      message: 'Trop de requêtes sur le journal, merci de réessayer plus tard.',
    }),
  );

  // Rate limiter sur les routes /blog (30 requêtes/15min max pour les uploads)
  app.use(
    '/blog',
    rateLimit({
      windowMs: 15 * 60_000, // 15 minutes
      max: 30,
      message: 'Trop de requêtes sur le blog, merci de réessayer plus tard.',
      skip: (req) => req.method === 'GET', // Skip pour les lectures
    }),
  );

  /**
   * N'exporte publiquement que les images d'événements et du blog placées dans
   * « uploads/events » et « uploads/blog ». Les autres sous-dossiers (justificatifs, documents
   * médicaux, etc.) restent privés et devront être servis via des routes
   * protégées.
   */
  const publicEventsFolder = join(process.cwd(), 'uploads', 'events');
  app.useStaticAssets(publicEventsFolder, {
    prefix: '/uploads/events/',
  });

  // Servir les images/vidéos du blog publiquement
  const publicBlogFolder = join(process.cwd(), 'uploads', 'blog');
  app.useStaticAssets(publicBlogFolder, {
    prefix: '/uploads/blog/',
  });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();

