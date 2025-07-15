// src/main.ts

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import * as express from 'express';
import rateLimit from 'express-rate-limit';
import { join } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { FRONTEND_BASE_URL } from './utils/frontend-url';

async function bootstrap() {
  // On précise que l'app est de type NestExpressApplication
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true, // Active le raw body pour les webhooks
  });

  // Configuration du proxy trust pour Traefik (plus spécifique)
  app.set('trust proxy', 1);

  // Configuration spéciale pour les webhooks Stripe - raw body nécessaire pour la vérification de signature
  app.use('/stripe/webhooks', express.raw({ type: 'application/json' }));

  // Définition dynamique des origines autorisées (CORS & CSP)
  const allowedOrigins = [
    'http://localhost:3000', // API locale (requêtes directes ou pré-visualisations)
    'https://api.educareschool.me',
    FRONTEND_BASE_URL, // Frontend dynamique (local ou prod)
  ];
  // Configuration des headers de sécurité avec Helmet (CSP stricte)
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: [
            "'self'",
            "'unsafe-inline'",
            'https://fonts.googleapis.com',
          ],
          fontSrc: ["'self'", 'https://fonts.gstatic.com'],
          imgSrc: ["'self'", 'data:', ...allowedOrigins],
          scriptSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: [
            "'self'",
            'http://localhost:3000',
            'https://api.educareschool.me',
          ],
          frameSrc: ["'none'"],
        },
      },
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      crossOriginEmbedderPolicy: false,
    }),
  );

  // Middleware pour parser les cookies
  app.use(cookieParser());

  // Validation globale (DTOs, class-validator)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      disableErrorMessages: false,
    }),
  );

  // CORS autorisé depuis le front
  app.enableCors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-CSRF-Token',
      'X-Requested-With',
      'Origin',
    ],
    credentials: true,
    optionsSuccessStatus: 200, // Pour les navigateurs anciens
  });

  // Rate limiter sur les routes /auth (10 requêtes/minute max)
  app.use(
    '/auth',
    rateLimit({
      windowMs: 60_000, // 1 minute
      max: 10,
      message:
        'Trop de tentatives sur /auth, merci de réessayer dans 1 minute.',
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
      message:
        'Trop de requêtes sur /auth/refresh, merci de réessayer dans 1 minute.',
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
      max: 100,
      message:
        'Trop de requêtes depuis cette IP, veuillez réessayer plus tard.',
    }),
  );

  // Rate limiter sur les routes /planning (sécurité renforcée)
  app.use(
    '/planning',
    rateLimit({
      windowMs: 60_000, // 1 minute
      max: 20, // 20 requêtes/min pour les opérations normales
      message:
        'Trop de requêtes sur le planning, merci de réessayer plus tard.',
    }),
  );

  // Rate limiter spécifique pour les imports Excel (très restrictif)
  app.use(
    '/planning/semesters/:semesterId/upload',
    rateLimit({
      windowMs: 60_000, // 1 minute
      max: 2, // 2 requêtes/min pour les imports
      message: "Trop d'imports Excel, merci de réessayer dans 1 minute.",
    }),
  );

  app.use(
    '/planning/semesters/:semesterId/import',
    rateLimit({
      windowMs: 60_000, // 1 minute
      max: 2, // 2 requêtes/min pour les imports
      message: "Trop d'imports Excel, merci de réessayer dans 1 minute.",
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
