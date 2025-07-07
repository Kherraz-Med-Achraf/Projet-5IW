import {
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { JournalService } from './journal.service';
import { PrismaService } from '../prisma/prisma.service';

/* ------------------------------------------------------------------- */
/*                            Prisma mock                              */
/* ------------------------------------------------------------------- */
class PrismaMock {
  /* in-memory stores */
  _years: any[] = [];
  _journals: any[] = [];
  _missions: any[] = [];
  _attachments: any[] = [];

  /* ---------------- AcademicYear ---------------- */
  academicYear = {
    findFirst: jest.fn(async ({ where }: any) =>
      this._years.find(
        (y) =>
          y.startDate <= where.startDate.lte && y.endDate >= where.endDate.gte,
      ),
    ),
  } as any;

  /* ---------------- JournalMensuel -------------- */
  journalMensuel = {
    create: jest.fn(async ({ data }: any) => {
      const j = {
        id: this._journals.length + 1,
        childId: data.child?.connect?.id,
        educatorId: data.educator?.connect?.id,
        academicYearId: data.academicYear?.connect?.id,
        month: data.month,
        isDraft: data.isDraft ?? true,
        isSubmitted: data.isSubmitted ?? false,
        contenu: data.contenu ?? null,
        progressionMissions: data.progressionMissions ?? {},
      };
      this._journals.push(j);
      return j;
    }),
    findMany: jest.fn(async ({ where }: any) => {
      return this._journals.filter((j) => {
        if (where.childId !== undefined && j.childId !== where.childId)
          return false;
        if (
          where.academicYearId !== undefined &&
          j.academicYearId !== where.academicYearId
        )
          return false;
        if (where.month !== undefined && j.month !== where.month) return false;
        return true;
      });
    }),
    findUnique: jest.fn(
      async ({ where }: any) =>
        this._journals.find((j) => j.id === where.id) ?? null,
    ),
    update: jest.fn(async ({ where, data }: any) => {
      const j = this._journals.find((jj) => jj.id === where.id);
      Object.assign(j, data);
      return j;
    }),
    delete: jest.fn(async ({ where }: any) => {
      const idx = this._journals.findIndex((j) => j.id === where.id);
      const [del] = this._journals.splice(idx, 1);
      return del;
    }),
    count: jest.fn(), // not used
  } as any;

  /* ---------------- Mission --------------------- */
  mission = {
    count: jest.fn(
      async ({ where }: any) =>
        this._missions.filter(
          (m) =>
            m.childId === where.childId &&
            m.academicYearId === where.academicYearId,
        ).length,
    ),
  } as any;

  /* ---------------- Attachment ------------------ */
  journalAttachment = {
    create: jest.fn(async ({ data }: any) => {
      const att = {
        id: this._attachments.length + 1,
        ...data.data,
        uploadedAt: new Date(),
      };
      this._attachments.push(att);
      return att;
    }),
    count: jest.fn(
      async ({ where }: any) =>
        this._attachments.filter((a) => a.journalId === where.journalId).length,
    ),
    findUnique: jest.fn(
      async ({ where }: any) =>
        this._attachments.find((a) => a.id === where.id) ?? null,
    ),
    delete: jest.fn(async ({ where }: any) => {
      const idx = this._attachments.findIndex((a) => a.id === where.id);
      const [del] = this._attachments.splice(idx, 1);
      return del;
    }),
  } as any;

  /* ---------------- Child / Parent mocks for verify ---------------- */
  child = {
    findUnique: jest.fn(async ({ where }: any) => ({ parentProfileId: 10 })),
  } as any;
  parentProfile = {
    findUnique: jest.fn(async () => ({ id: 10 })),
  } as any;
}

/* ------------------------------------------------------------------- */
/*                                 Tests                               */
/* ------------------------------------------------------------------- */
describe('JournalService', () => {
  let svc: JournalService;
  let prisma: PrismaMock;

  beforeEach(() => {
    prisma = new PrismaMock();
    svc = new JournalService(prisma as unknown as PrismaService);

    // Setup one academic year 2100-09-01 → 2101-08-31
    prisma._years.push({
      id: 1,
      startDate: new Date('2100-09-01'),
      endDate: new Date('2101-08-31'),
    });
  });

  /* ---------------- findByMonth ---------------- */
  it('findByMonth refuse un format invalide', async () => {
    await expect(svc.findByMonth('2025-13')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('findByMonth refuse sans année académique', async () => {
    await expect(svc.findByMonth('2099-06')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  /* ---------------- create / update ------------- */
  it('create puis update un brouillon', async () => {
    const draft = await svc.create({
      child: { connect: { id: 1 } },
      educator: { connect: { id: 'u1' } },
      academicYear: { connect: { id: 1 } },
      month: 6,
      contenu: 'init',
      progressionMissions: {},
      isDraft: true,
      isSubmitted: false,
    } as any);
    expect(draft.id).toBe(1);

    const updated = await svc.update(draft.id, {
      contenu: 'modif',
      progressionMissions: {},
    });
    expect(updated.contenu).toBe('modif');
  });

  it('update refuse si journal soumis', async () => {
    const j = await svc.create({
      child: { connect: { id: 1 } },
      educator: { connect: { id: 'u' } },
      academicYear: { connect: { id: 1 } },
      month: 7,
      isDraft: true,
      isSubmitted: true,
    } as any);
    await expect(
      svc.update(j.id, { contenu: 'x' } as any),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  /* ---------------- submit ---------------------- */
  it('submit refuse sans missions', async () => {
    const j = await svc.create({
      child: { connect: { id: 1 } },
      educator: { connect: { id: 'e' } },
      academicYear: { connect: { id: 1 } },
      month: 5,
      isDraft: true,
      isSubmitted: false,
    } as any);
    await expect(svc.submit(j.id)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('submit passe isSubmitted à true', async () => {
    prisma._missions.push({
      id: 1,
      childId: 1,
      academicYearId: 1,
      description: 'desc',
    });
    const j = await svc.create({
      child: { connect: { id: 1 } },
      educator: { connect: { id: 'e' } },
      academicYear: { connect: { id: 1 } },
      month: 4,
      isDraft: true,
      isSubmitted: false,
    } as any);
    const res = await svc.submit(j.id);
    expect(res.isSubmitted).toBe(true);
  });

  /* ---------------- reopen ---------------------- */
  it('reopen repasse isSubmitted à false', async () => {
    const j = await svc.create({
      child: { connect: { id: 1 } },
      educator: { connect: { id: 'e' } },
      academicYear: { connect: { id: 1 } },
      month: 9,
      isDraft: true,
      isSubmitted: true,
    } as any);
    const rep = await svc.reopen(j.id);
    expect(rep.isSubmitted).toBe(false);
  });

  /* ---------------- attachments ----------------- */
  it('addAttachment + limite 3', async () => {
    const j = await svc.create({
      child: { connect: { id: 1 } },
      educator: { connect: { id: 'e' } },
      academicYear: { connect: { id: 1 } },
      month: 10,
      isDraft: true,
      isSubmitted: false,
    } as any);
    await svc.addAttachment(j.id, 'f1', 'orig1');
    await svc.addAttachment(j.id, 'f2', 'orig2');
    await svc.addAttachment(j.id, 'f3', 'orig3');
    await expect(svc.addAttachment(j.id, 'f4', 'orig4')).resolves.toBeDefined(); // le service lui-même ne limite pas, check côté controller
  });
});
