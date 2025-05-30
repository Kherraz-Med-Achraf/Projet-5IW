//import './instrument';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ChildModule } from './child/child.module';
import { ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';


async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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
      message:
        'Trop de tentatives sur /auth, merci de réessayer dans 1 minute.',
    }),
  );

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
