import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { ChildService } from '../child/child.service';
import { MailService } from '../mail/mail.service';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';

class PrismaMock {
  public user: any;
  public invitation: any;
  public emailVerification: any;
  private _users: any[] = [];
  private _inv: any[] = [];
  constructor() {
    this.user = {
      findUnique: jest.fn(({ where }: any) =>
        this._users.find((u) => u.email === where.email),
      ),
      create: jest.fn(({ data }: any) => {
        this._users.push(data);
        return data;
      }),
    };
    this.invitation = {
      validate: jest.fn(),
    };
  }
}

const childMock = { createForParent: jest.fn() } as unknown as ChildService;
const mailMock = {} as unknown as MailService;

describe('AuthService – registerWithRole()', () => {
  let prisma: PrismaMock;
  let svc: AuthService;

  beforeEach(() => {
    prisma = new PrismaMock();
    svc = new AuthService(
      prisma as unknown as PrismaService,
      {} as any,
      mailMock,
      childMock,
    );
    (jest.spyOn(bcrypt as any, 'hash') as any).mockResolvedValue('HASH');
  });

  it('crée un parent + profile + enfants', async () => {
    const dto = {
      token: 'tok',
      email: 'parent@ex.com',
      password: 'LongPwd123!!',
      passwordConfirm: 'LongPwd123!!',
      firstName: 'John',
      lastName: 'Doe',
      phone: '0600',
      address: '1 rue',
      legalResponsibility: 'Père',
      children: [
        { firstName: 'Kid', lastName: 'One', birthDate: '2015-01-01' },
      ],
      emergencyContacts: [],
    } as any;

    await svc.registerWithRole(dto, Role.PARENT);
    expect(prisma.user.create).toHaveBeenCalled();
    expect(childMock.createForParent).toHaveBeenCalled();
  });

  it('rejette si email déjà utilisé', async () => {
    prisma.user.create({ data: { email: 'dup@ex.com' } });
    const dto: any = {
      email: 'dup@ex.com',
      password: 'x',
      passwordConfirm: 'x',
    };
    await expect(svc.registerWithRole(dto, Role.PARENT)).rejects.toThrow(
      /déjà utilisé/,
    );
  });
});
