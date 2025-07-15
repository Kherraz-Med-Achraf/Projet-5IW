// backend/src/app.module.ts
import * as fs from 'fs';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MongooseModule } from '@nestjs/mongoose';
//import { SentryModule, SentryGlobalFilter } from "@sentry/nestjs/setup";
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { ChildModule } from './child/child.module';
import { ParentModule } from './parent/parent.module';
import { SecretaryModule } from './secretary/secretary.module';
import { DirectorModule } from './director/director.module';
import { StaffModule } from './staff/staff.module';
import { ServiceManagerModule } from './service-manager/service-manager.module';
import { InvitationModule } from './invitation/invitation.module';
import { AcademicYearModule } from './academic-year/academic-year.module';
import { MissionModule } from './mission/mission.module';
import { JournalModule } from './journal/journal.module';
import { AiModule } from './ai/ai.module';
import { HealthModule } from './health/health.module';
import { PresenceModule } from './presence/presence.module';
import { ScheduleModule } from '@nestjs/schedule';
import { PlanningModule } from './planning/planning.module';
import { EventModule } from './event/event.module';
import { BlogModule } from './blog/blog.module';

// **Nouvel import**
import { ChatModule } from './chat/chat.module';
import { EmergencyContactModule } from './emergency-contact/emergency-contact.module';
import { DocumentModule } from './document/document.module';

function readSecret(path: string, envVar: string): string {
  // si la variable d’environnement est présente (mode docker-compose), on la prend
  if (process.env[envVar] && process.env[envVar].length > 0) {
    return process.env[envVar];
  }
  // sinon on lit le secret Docker (mode Swarm)
  return fs.readFileSync(path, 'utf8').trim();
}

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    // **Postgres via TypeORM**
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.POSTGRES_HOST || 'postgres',
      port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
      username: process.env.POSTGRES_USER || 'myuser',
      password: readSecret('/run/secrets/pg_password', 'POSTGRES_PASSWORD'),
      database: process.env.POSTGRES_DB || 'mydb',
      autoLoadEntities: true,
      synchronize: true,
      retryAttempts: 30,
      retryDelay: 5000,
    }),

    // **MongoDB via Mongoose**
    MongooseModule.forRootAsync({
      useFactory: () => {
        const mongoUser = process.env.MONGO_USER || 'myuser';
        const mongoHost = process.env.MONGO_HOST || 'mongodb';
        const mongoPort = process.env.MONGO_PORT || '27017';
        const mongoDb   = process.env.MONGO_DB   || 'mydb';
        const mongoPw   = readSecret('/run/secrets/mongo_root_password', 'MONGO_PASSWORD');
        return {
          uri: `mongodb://${mongoUser}:${mongoPw}@${mongoHost}:${mongoPort}/${mongoDb}?authSource=admin`,
        };
      },
    }),
    ScheduleModule.forRoot(),
    // Modules métiers
    AuthModule,
    AcademicYearModule,
    ChildModule,
    ParentModule,
    SecretaryModule,
    DirectorModule,
    StaffModule,
    ServiceManagerModule,
    HealthModule,
    InvitationModule,
    JournalModule,
    MissionModule,
    AiModule,
    ChatModule,
    PresenceModule,
    PlanningModule,
    EventModule,
    BlogModule,
    EmergencyContactModule,
    DocumentModule,

    // **Module Chat pour la messagerie instantanée**
    ChatModule,

    // Global rate-limiting : 10 requêtes / minute par IP
    ThrottlerModule.forRoot([{ ttl: 60, limit: 10 }]),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}

//{
//   provide: APP_FILTER,
//   useClass: SentryGlobalFilter,
//}
