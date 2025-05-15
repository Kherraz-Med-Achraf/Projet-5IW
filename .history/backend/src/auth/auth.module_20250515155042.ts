import { Module } from '@nestjs/common'
import { PassportModule } from '@nestjs/passport'
import { JwtModule } from '@nestjs/jwt'

import { AuthService } from './auth.service'
import { AuthController } from './controllers/auth.controller'
import { OtpController } from './controllers/otp.controller'
import { EmailVerificationController } from './controllers/email-verification.controller'

import { JwtStrategy } from './jwt.strategy'
import { PrismaService } from '../prisma/prisma.service'
import { MailModule } from '../mail/mail.module'

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'secret',
      signOptions: { expiresIn: '1d' },
    }),
    MailModule,
  ],
  providers: [AuthService, PrismaService, JwtStrategy],
  controllers: [
    AuthController,
    OtpController,
    EmailVerificationController,
  ],
})
export class AuthModule {}
