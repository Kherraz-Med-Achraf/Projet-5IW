// backend/src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 1) Parser les cookies et valider les DTO
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

  // 2) CORS
  app.enableCors({
    origin: 'http://localhost:5173',
    credentials: true,
  });

  // 3) Rate-limit uniquement sur /auth : 10 reqs / 60 s par IP
  app.use(
    '/auth',
    rateLimit({
      windowMs: 60_000,      // 1 minute
      max: 10,               // max. 10 requêtes
      message:
        'Trop de tentatives sur /auth, merci de réessayer dans 1 minute.',
    }),
  );

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
