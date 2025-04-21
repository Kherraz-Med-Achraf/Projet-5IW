import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import * as fs from 'fs';



@Module({
  imports: [
    // Permet de charger les variables d'environnement (.env)
    // et de les rendre disponibles via process.env
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
      retryAttempts: 20,    // nombre maximal de tentatives
      retryDelay: 3000,     // délai (ms) entre chaque tentative
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
