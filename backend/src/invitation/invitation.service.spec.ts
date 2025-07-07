import { InvitationService } from './invitation.service';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';

/* -------------------- Mocks -------------------- */
class PrismaMock {
  public invitation: any;
  public user: any;
  private _invites: any[] = [];
  private _users: any[] = [];

  constructor() {
    this.invitation = {
      create: jest.fn(async ({ data }: any) => {
        this._invites.push({ ...data, id: 1, used: false });
        return this._invites.at(-1);
      }),
      findFirst: jest.fn(async ({ where }: any) =>
        this._invites.find((i) => i.email === where.email && !i.used),
      ),
      findUnique: jest.fn(async ({ where }: any) =>
        this._invites.find((i) => i.token === where.token),
      ),
      update: jest.fn(async ({ where, data }: any) => {
        const inv = this._invites.find((i) => i.token === where.token);
        Object.assign(inv, data);
        return inv;
      }),
      findMany: jest.fn(),
      delete: jest.fn(),
    };
    this.user = {
      findUnique: jest.fn(async ({ where }: any) =>
        this._users.find((u) => u.email === where.email),
      ),
      create: jest.fn(async ({ data }: any) => {
        this._users.push(data);
        return data;
      }),
    };
  }
}

class MailMock {
  sendMail = jest.fn();
}

/* -------------- Tests create / validate -------------- */

describe('InvitationService', () => {
  let prisma: PrismaMock;
  let svc: InvitationService;
  let mail: MailMock;

  beforeEach(() => {
    prisma = new PrismaMock();
    mail = new MailMock();
    svc = new InvitationService(
      prisma as unknown as PrismaService,
      mail as unknown as MailService,
    );
  });

  it('createInvitation -> crée, envoie le mail et renvoie le token', async () => {
    const exp = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const inv = await svc.createInvitation(
      'foo@test.com',
      Role.PARENT,
      'adminId',
      exp,
    );

    expect(inv).toHaveProperty('token');
    expect(prisma.invitation.create).toHaveBeenCalled();
    expect(mail.sendMail).toHaveBeenCalledWith(
      'foo@test.com',
      expect.any(String),
      expect.stringContaining(inv.token),
    );
  });

  it('validateToken refuse les cas invalides', async () => {
    const exp = new Date(Date.now() - 1000); // déjà expirée
    const inv = await prisma.invitation.create({
      data: {
        email: 'x',
        token: 'tok',
        expiresAt: exp,
        roleToAssign: Role.PARENT,
        invitedBy: 'a',
      },
    });
    await expect(svc.validateToken('tok')).rejects.toThrow();
  });

  it('markAsUsed positionne used=true', async () => {
    const exp = new Date(Date.now() + 10000);
    const inv = await svc.createInvitation(
      'bar@test.com',
      Role.PARENT,
      'admin',
      exp,
    );
    await svc.markAsUsed(inv.token);
    const rec = await svc.validateToken(inv.token).catch((e) => e);
    expect(rec.message).toMatch(/déjà été utilisé|déjà utilisé/i);
  });
});
