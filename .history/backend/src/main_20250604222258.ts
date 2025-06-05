import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { join } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Parser les cookies
  app.use(cookieParser());

  // Validation globale
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

  // CORS
  app.enableCors({
    origin: 'http://localhost:5173',
    credentials: true,
  });

  // Rate-limiter sur /auth
  app.use(
    '/auth',
    rateLimit({
      windowMs: 60_000,
      max: 10,
      message: 'Trop de tentatives sur /auth, merci de réessayer dans 1 minute.',
    }),
  );

  // Sert le dossier "<racine_projet>/uploads" via le préfixe "/uploads/"
  const uploadsFolder = join(process.cwd(), 'uploads');
  app.useStaticAssets(uploadsFolder, {
    prefix: '/uploads/',
  });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
