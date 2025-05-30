// src/child/child.module.ts
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from '../prisma/prisma.module';
import { MailModule } from '../mail/mail.module';
import { ChildService } from './child.service';
import { ChildController } from './child.controller';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';

@Module({
  imports: [
    PrismaModule,
    MailModule,       // ← Permet l’injection de MailService dans ChildService
  ],
  controllers: [ChildController],
  providers: [
    ChildService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class ChildModule {}
