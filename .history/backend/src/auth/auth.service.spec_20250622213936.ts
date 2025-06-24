// @ts-nocheck
import * as request from 'supertest';
import * as express from 'express';
import rateLimit from 'express-rate-limit';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { MailService } from '../mail/mail.service';
import { ChildService } from '../child/child.service';
import { HttpException, HttpStatus } from '@nestjs/common';

/* -------------------------------------------------- */
/* Utilitaire : Mock Prisma avec état interne user    */
/* -------------------------------------------------- */
class PrismaMock {
  private _user: any;
  public user: any;
  public passwordReset: any;

  constructor(initialUser?: any) {
    this._user = initialUser;

    this.user = {
      findUnique: jest.fn(async ({ where }: any) => {
        if (where?.email || where?.id) return this._user;
        return null;
      }),
      update: jest.fn(async ({ data }: any) => {
        this._user = { ...this._user, ...data };
        return this._user;
      }),
      create: jest.fn(),
    };

    this.passwordReset = {
      create: jest.fn(async ({ data }: any) => ({ id: 42, ...data })),
    };
  }
}

/* -------------------------------------------------- */
/* Mocks externes                                     */
/* -------------------------------------------------- */
const jwtMock = {
  sign : jest.fn(() => 'token'),
  verify: jest.fn(() => ({ sub: 'uid', email: 'e', role: 'PARENT', iat: Date.now()/1000 })),
} as unknown as JwtService;

const mailMock = { sendMail: jest.fn() } as unknown as MailService;
const childMock = {} as unknown as ChildService;

/* -------------------------------------------------- */
/* 1. Verrouillage après 3 échecs de connexion         */
/* -------------------------------------------------- */

describe('AuthService – sécurité connexion', () => {
  const PWD_HASH = 'HASH';
  const baseUser = {
    id: 'u1',
    email: 'user@test.com',
    password: PWD_HASH,
    failedLoginAttempts: 0,
    lockUntil: null,
    otpSecret: null,
    role: 'PARENT',
    passwordChangedAt: new Date(),
  };

  let prisma: PrismaMock;
  let svc: AuthService;

  beforeEach(() => {
    prisma = new PrismaMock({ ...baseUser });
    svc = new AuthService(prisma as unknown as PrismaService, jwtMock, mailMock, childMock);
  });

  it('bloque le compte après 3 mots de passe erronés', async () => {
    // bcrypt.compare renvoie false pour mot de passe incorrect
    jest.spyOn(bcrypt, 'compare').mockImplementation(async () => false);

    // 3 premières tentatives → UNAUTHORIZED
    for (let i = 0; i < 3; i++) {
      await expect(svc.login(baseUser.email, 'badpwd')).rejects.toHaveProperty('status', HttpStatus.UNAUTHORIZED);
    }

    // 4e tentative → compte verrouillé (status 423)
    await expect(svc.login(baseUser.email, 'badpwd')).rejects.toHaveProperty('status', HttpStatus.LOCKED);
  });
});

/* -------------------------------------------------- */
/* 2. Rate-limiter /auth (express-rate-limit)          */
/* -------------------------------------------------- */

describe('Rate limiter /auth', () => {
  const app = express();
  // Limite 2 requêtes / 100 ms pour accélérer le test
  app.use('/auth', rateLimit({ windowMs: 100, max: 2 }));
  app.post('/auth/login', (_req: any, res: any) => { res.status(200).send('ok'); });

  it('retourne 429 après dépassement', async () => {
    const agent = request(app);
    await agent.post('/auth/login').expect(200);
    await agent.post('/auth/login').expect(200);
    await agent.post('/auth/login').expect(429);
  });
});

/* -------------------------------------------------- */
/* 3. Mot de passe oublié                              */
/* -------------------------------------------------- */

describe('AuthService – forgotPassword()', () => {
  const user = {
    id: 'uid',
    email: 'foo@bar.com',
    password: 'HASH',
    failedLoginAttempts: 0,
    lockUntil: null,
    otpSecret: null,
    role: 'PARENT',
    passwordChangedAt: new Date(),
  };

  let prisma: PrismaMock;
  let svc: AuthService;

  beforeEach(() => {
    prisma = new PrismaMock({ ...user });
    svc = new AuthService(prisma as unknown as PrismaService, jwtMock, mailMock, childMock);
    (jest.spyOn(bcrypt, 'hash') as any).mockResolvedValue('hashed');
    jest.spyOn(crypto, 'randomBytes').mockReturnValue(Buffer.alloc(32, 1) as any);
    (mailMock.sendMail as jest.Mock).mockClear();
  });

  it('envoie un mail de réinitialisation', async () => {
    const res = await svc.forgotPassword(user.email);
    expect(res).toEqual({ message: "Si l'adresse existe, un lien vient d'être envoyé." });
    expect(mailMock.sendMail).toHaveBeenCalledWith(
      user.email,
      expect.stringContaining('Réinitialisation'),
      expect.stringContaining('reset-password?prid='),
    );
  });

  it("ne révèle pas l'existence de l'email", async () => {
    prisma = new PrismaMock(undefined); // aucun user
    svc = new AuthService(prisma as unknown as PrismaService, jwtMock, mailMock, childMock);
    const res = await svc.forgotPassword('nobody@nowhere.com');
    expect(res).toEqual({ message: "Si l'adresse existe, un lien vient d'être envoyé." });
    expect(mailMock.sendMail).not.toHaveBeenCalled();
  });
});

/* -------------------------------------------------- */
/* 4. OTP enable / disable                            */
/* -------------------------------------------------- */

describe('AuthService – OTP enable / disable', () => {
  const user = {
    id: 'uOtp',
    email: 'otp@test.com',
    password: 'HASH',
    failedLoginAttempts: 0,
    lockUntil: null,
    otpSecret: null,
    role: 'PARENT',
    passwordChangedAt: new Date(),
  };

  let prisma: PrismaMock; let svc: AuthService;

  beforeEach(() => {
    process.env.NODE_ENV = 'test';
    prisma = new PrismaMock({ ...user });
    svc    = new AuthService(prisma as unknown as PrismaService, jwtMock, mailMock, childMock);

    // Mock hashing du refresh token
    (jest.spyOn(bcrypt, 'hash') as any).mockResolvedValue('HASH');

    // Mock secret + QR
    jest.spyOn(require('speakeasy'), 'generateSecret').mockReturnValue({
      base32: 'BASE32SECRET',
      otpauth_url: 'otpauth://totp/MyApp?secret=BASE32SECRET',
    } as any);
    jest.spyOn(require('qrcode'), 'toDataURL').mockResolvedValue('data:image/png;base64,AAA');

    // Mock jwt sign pour tokens
    (jwtMock.sign as jest.Mock).mockReturnValue('jwt-token');
  });

  afterEach(() => jest.restoreAllMocks());

  it('enableOtp stocke un secret chiffré et renvoie QR', async () => {
    const res = await svc.enableOtp(user.id);
    expect(res).toEqual({ secret: 'BASE32SECRET', qrCodeDataUrl: 'data:image/png;base64,AAA' });
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: user.id },
      data : { otpSecret: expect.any(String) },
    });
  });

  it('disableOtp réinitialise otpSecret et renvoie nouveaux tokens', async () => {
    // Prépare un user déjà équipé d un otpSecret
    prisma = new PrismaMock({ ...user, otpSecret: 'encrypted' });
    svc    = new AuthService(prisma as unknown as PrismaService, jwtMock, mailMock, childMock);

    const res = await svc.disableOtp(user.id);
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: user.id },
      data : { otpSecret: null },
    });
    expect(res).toHaveProperty('access_token', 'jwt-token');
    expect(res).toHaveProperty('refresh_token', 'jwt-token');
  });
});

/* -------------------------------------------------- */
/* 5. Connexion réussie sans OTP                      */
/* -------------------------------------------------- */

describe('AuthService – login() sans OTP', () => {
  const PWD_HASH  = 'HASHED_PWD'
  const baseUser = {
    id: 'uLogin',
    email: 'login@test.com',
    password: PWD_HASH,
    failedLoginAttempts: 2,
    lockUntil: new Date(Date.now() - 1000), // expiré
    otpSecret: null,
    role: 'PARENT',
    passwordChangedAt: new Date(),
  }

  let prisma: PrismaMock; let svc: AuthService

  beforeEach(() => {
    prisma = new PrismaMock({ ...baseUser })
    svc    = new AuthService(prisma as unknown as PrismaService, jwtMock, mailMock, childMock)

    (jest.spyOn(bcrypt as any, 'compare') as any).mockResolvedValue(true)
    (jest.spyOn(bcrypt as any, 'hash') as any).mockResolvedValue('REFRESH_HASH')
    ;(jwtMock.sign as jest.Mock).mockReturnValue('jwt-token')
  })

  afterEach(() => jest.restoreAllMocks())

  it('retourne les tokens et réinitialise failedLoginAttempts + lockUntil', async () => {
    const res = await svc.login(baseUser.email, 'goodpwd')

    expect(res).toEqual({ access_token: 'jwt-token', refresh_token: 'jwt-token', user: expect.any(Object) })

    // le user est mis à jour dans PrismaMock
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: baseUser.id },
      data : { refreshToken: 'REFRESH_HASH' },
    })

    expect((prisma as any)._user.failedLoginAttempts).toBe(0)
    expect((prisma as any)._user.lockUntil).toBeNull()
  })
})

/* -------------------------------------------------- */
/* 6. Connexion avec OTP                              */
/* -------------------------------------------------- */

describe('AuthService – login() avec OTP', () => {
  const user = {
    id: 'uOtpLogin',
    email: 'otp@login.com',
    password: 'HASHED',
    failedLoginAttempts: 0,
    lockUntil: null,
    otpSecret: 'BASE32SECRET',
    role: 'PARENT',
    passwordChangedAt: new Date(),
  }

  let prisma: PrismaMock; let svc: AuthService
  let speakeasy: any

  beforeEach(() => {
    speakeasy = require('speakeasy')
    prisma    = new PrismaMock({ ...user })
    svc       = new AuthService(prisma as unknown as PrismaService, jwtMock, mailMock, childMock);

    (jest.spyOn(bcrypt as any, 'compare') as any).mockResolvedValue(true)
    (jest.spyOn(bcrypt as any, 'hash') as any).mockResolvedValue('REFRESH_HASH')
    ;(jwtMock.sign as jest.Mock).mockReturnValue('jwt-token')
  })

  afterEach(() => jest.restoreAllMocks())

  it('requiert un otpCode sinon 401', async () => {
    await expect(svc.login(user.email, 'pwdSansOtp'))
      .rejects.toHaveProperty('status', HttpStatus.UNAUTHORIZED)
  })

  it('refuse un otpCode invalide', async () => {
    const totpObj: any = (speakeasy as any).totp
    totpObj.verify = jest.fn(() => false)

    await expect(svc.login(user.email, 'pwd', '000000'))
      .rejects.toHaveProperty('status', HttpStatus.UNAUTHORIZED)
  })

  it('accepte un otpCode valide et renvoie les tokens', async () => {
    const totpObj: any = (speakeasy as any).totp
    totpObj.verify = jest.fn(() => true)

    const res = await svc.login(user.email, 'pwd', '123456')
    expect(res).toEqual({ access_token: 'jwt-token', refresh_token: 'jwt-token', user })
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: user.id },
      data : { refreshToken: 'REFRESH_HASH' },
    })
  })
}) 