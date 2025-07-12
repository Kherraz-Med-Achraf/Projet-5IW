import './instrument';
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

  // Configuration du proxy trust pour Traefik
  app.set('trust proxy', 1);

  // Configuration spéciale pour les webhooks Stripe
  app.use('/stripe/webhooks', express.raw({ type: 'application/json' }));

  // Définition des origines autorisées
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:5173',
    'https://educareschool.me',
    'https://api.educareschool.me',
    FRONTEND_BASE_URL,
  ];

  // Configuration Helmet simplifiée
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
          mediaSrc: ["'self'", ...allowedOrigins],
          frameSrc: ["'none'"],
        },
      },
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      crossOriginEmbedderPolicy: false,
    }),
  );

  // Traque des requêtes + contexte pour Sentry
  // @ts-ignore - Handlers n'est pas typé dans declarations
  app.use((Sentry as any).Handlers.requestHandler());

  // (les erreurs gérées par Nest repasseront par ce middleware global)
  // @ts-ignore
  app.use((Sentry as any).Handlers.errorHandler());

  // Middleware pour parser les cookies
  app.use(cookieParser());

  // Validation globale
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      disableErrorMessages: false,
    }),
  );

  // CORS simplifié et plus permissif
  app.enableCors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-CSRF-Token',
      'X-Requested-With',
      'Origin',
      'Accept',
    ],
    credentials: true,
    optionsSuccessStatus: 200,
    preflightContinue: false,
  });

  // Rate limiter BEAUCOUP plus permissif pour /auth
  app.use(
    '/auth',
    rateLimit({
      windowMs: 60_000, // 1 minute
      max: 50, // 50 requêtes/minute (au lieu de 10)
      message: 'Trop de tentatives, réessayez dans 1 minute.',
      standardHeaders: true,
      legacyHeaders: false,
      skipSuccessfulRequests: true, // Ne pas compter les succès
      skipFailedRequests: false,
    }),
  );

  // Rate limiter plus permissif pour /auth/refresh
  app.use(
    '/auth/refresh',
    rateLimit({
      windowMs: 60_000,
      max: 20, // 20 requêtes/min (au lieu de 5)
      message: 'Trop de requêtes refresh, réessayez dans 1 minute.',
    }),
  );

  // Rate limiter pour les autres routes (plus permissif)
  app.use(
    '/events',
    rateLimit({
      windowMs: 15 * 60_000,
      max: 200, // 200 requêtes/15min
      message: 'Trop de requêtes sur /events.',
    }),
  );

  app.use(
    '/journal',
    rateLimit({
      windowMs: 15 * 60_000,
      max: 100, // 100 requêtes/15min
      message: 'Trop de requêtes sur le journal.',
    }),
  );

  app.use(
    '/blog',
    rateLimit({
      windowMs: 15 * 60_000,
      max: 200, // 200 requêtes/15min
      message: 'Trop de requêtes sur le blog.',
    }),
  );

  app.use(
    '/planning',
    rateLimit({
      windowMs: 60_000,
      max: 50, // 50 requêtes/min
      message: 'Trop de requêtes sur le planning.',
    }),
  );

  // Rate limiter pour les imports Excel
  app.use(
    '/planning/semesters/:semesterId/upload',
    rateLimit({
      windowMs: 60_000,
      max: 5, // 5 requêtes/min
      message: "Trop d'imports Excel.",
    }),
  );

  app.use(
    '/planning/semesters/:semesterId/import',
    rateLimit({
      windowMs: 60_000,
      max: 5, // 5 requêtes/min
      message: "Trop d'imports Excel.",
    }),
  );

  // Servir les fichiers statiques publics
  const publicEventsFolder = join(process.cwd(), 'uploads', 'events');
  app.useStaticAssets(publicEventsFolder, {
    prefix: '/uploads/events/',
  });

  const publicBlogFolder = join(process.cwd(), 'uploads', 'blog');
  app.useStaticAssets(publicBlogFolder, {
    prefix: '/uploads/blog/',
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`🚀 Backend démarré sur le port ${port}`);
  console.log(`🌐 Origines CORS autorisées : ${allowedOrigins.join(', ')}`);
}
bootstrap();
