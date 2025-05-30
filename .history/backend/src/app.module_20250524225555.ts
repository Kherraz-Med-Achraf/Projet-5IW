// src/app.module.ts
import { Module } from '@nestjs/common';
import { APP_FILTER } from "@nestjs/core";
//import { SentryModule, SentryGlobalFilter } from "@sentry/nestjs/setup";
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { ChildModule } from './child/child.module';  // ← ajouté
import { ParentModule } from './parent/parent.module';  
import * as fs from 'fs';

@Module({
  imports: [
    //SentryModule.forRoot(), 
    ConfigModule.forRoot({
      isGlobal: true, 
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.POSTGRES_HOST || 'postgres',
      port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
      username: process.env.POSTGRES_USER || 'myuser',
      password: process.env.POSTGRES_PASSWORD || fs.readFileSync('/run/secrets/pg_password', 'utf8').trim(),
      database: process.env.POSTGRES_DB || 'mydb',
      autoLoadEntities: true,
      synchronize: true, // à utiliser uniquement en dev
      retryAttempts: 30,
      retryDelay: 5000,
    }),
    AuthModule,
    ChildModule,  // ← on le déclare ici
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
//{
//   provide: APP_FILTER,
//   useClass: SentryGlobalFilter,
//}
