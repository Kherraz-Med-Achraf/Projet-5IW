import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
//import { SentryModule, SentryGlobalFilter } from '@sentry/nestjs/setup';
import { ConfigModule } from '@nestjs/config';
// → On retire TypeOrmModule si on passe entièrement à Prisma
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { ChildModule } from './child/child.module';
// (éventuellement ParentModule si tu l’as créé aussi)

@Module({
  imports: [
    // SentryModule.forRoot(),
    ConfigModule.forRoot({ isGlobal: true }),

    // Si tu actives Prisma, tu n'as plus besoin de TypeOrmModule :
    PrismaModule,

    AuthModule,
    ChildModule,
    // ParentModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // {
    //   provide: APP_FILTER,
    //   useClass: SentryGlobalFilter,
    // },
  ],
})
export class AppModule {}
