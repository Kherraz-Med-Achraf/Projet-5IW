// src/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';

import { AuthService } from './auth.service';
import { AuthController } from './controllers/auth.controller';
import { OtpController } from './controllers/otp.controller';
import { EmailVerificationController } from './controllers/email-verification.controller';

import { JwtStrategy } from './strategies/jwt.strategy';
import { PrismaService } from '../prisma/prisma.service';
import { MailModule } from '../mail/mail.module';
import { ChildModule } from '../child/child.module'; 

// ← IMPORTER le module Invitation ici
import { InvitationModule } from '../invitation/invitation.module';

@Module({
  imports: [
    // Installe la stratégie JWT comme stratégie par défaut
    PassportModule.register({ defaultStrategy: 'jwt' }),

    JwtModule.register({
      secret: process.env.JWT_SECRET || 'secret',
      signOptions: { expiresIn: '1d' },
    }),

    MailModule,

    // ← On importe InvitationModule pour que InvitationService soit “injectable”
    InvitationModule,
  ],
  providers: [
    AuthService,
    PrismaService,
    JwtStrategy,
  ],
  controllers: [
    AuthController,
    OtpController,
    EmailVerificationController,
  ],
  exports: [
    // Permettre aux autres modules de réutiliser JwtGuard, etc.
    PassportModule,
    JwtModule,
  ],
})
export class AuthModule {}
