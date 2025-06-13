// backend/src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MongooseModule } from '@nestjs/mongoose';
//import { SentryModule, SentryGlobalFilter } from "@sentry/nestjs/setup";
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

// **Nouvel import**
import { ChatModule } from './chat/chat.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    // **Postgres via TypeORM**
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.POSTGRES_HOST || 'postgres',
      port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
      username: process.env.POSTGRES_USER || 'myuser',
      password:
        process.env.POSTGRES_PASSWORD ||
        fs.readFileSync('/run/secrets/pg_password', 'utf8').trim(),
      database: process.env.POSTGRES_DB || 'mydb',
      autoLoadEntities: true,
      synchronize: true,
      retryAttempts: 30,
      retryDelay: 5000,
    }),

    // **MongoDB via Mongoose**
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        uri: `mongodb://${config.get('MONGO_USER')}:${config.get('MONGO_PASSWORD')}@${config.get('MONGO_HOST')}:${config.get('MONGO_PORT')}/${config.get('MONGO_DB')}`,
      }),
      inject: [ConfigService],
    }),

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

    // **Module Chat pour la messagerie instantanée**
    ChatModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

//{
//   provide: APP_FILTER,
//   useClass: SentryGlobalFilter,
//}
