import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PresenceService } from './presence.service';
import { PrismaService } from '../prisma/prisma.service';
import { JustificationType } from './dto/presence.dto';

/* -------------------- Prisma mock -------------------- */
class PrismaMock {
  // in-memory stores
  _sheets: any[] = [];
  _records: any[] = [];
  _justifs: any[] = [];
  private _children: any[] = [
    { id: 1, firstName: 'Kid', lastName: 'One' },
    { id: 2, firstName: 'Kid', lastName: 'Two' },
  ];

  presenceSheet = {
    upsert: jest.fn(async ({ where, create }: any) => {
      let s = this._sheets.find((sh) => sh.date === where.date);
      if (!s) {
        s = { id: this._sheets.length + 1, ...create };
        this._sheets.push(s);
      }
      return s;
    }),
    findUnique: jest.fn(async ({ where }: any) => {
      const s = this._sheets.find((sh) => sh.id === where.id || sh.date === where.date);
      if (!s) return null;
      // enrich with records
      const records = this._records.filter((r) => r.sheetId === s.id).map((r) => ({
        ...r,
        child: this._children.find((c) => c.id === r.childId) ?? {},
        justification: this._justifs.find((j) => j.recordId === r.id) ?? null,
      }));
      return { ...s, records, staff: {}, validatedBySecretary: s.validatedBySecretary ?? false };
    }),
    update: jest.fn(async ({ where, data }: any) => {
      const s = this._sheets.find((sh) => sh.id === where.id);
      Object.assign(s, data);
      return await this.presenceSheet.findUnique({ where });
    }),
  } as any;

  presenceRecord = {
    findFirst: jest.fn(async ({ where }: any) => this._records.find((r) => r.sheetId === where.sheetId)),
    createMany: jest.fn(async ({ data }: any) => {
      data.forEach((d: any) => {
        this._records.push({ id: this._records.length + 1, ...d });
      });
    }),
    deleteMany: jest.fn(async ({ where }: any) => {
      this._records = this._records.filter((r) => r.sheetId !== where.sheetId);
    }),
    findUnique: jest.fn(async ({ where }: any) => this._records.find((r) => r.id === where.id) ?? null),
    count: jest.fn(async ({ where }: any) => {
      return this._records.filter(
        (r) => r.sheetId === where.sheetId && r.present === where.present && !this._justifs.some((j) => j.recordId === r.id),
      ).length;
    }),
  } as any;

  absenceJustification = {
    create: jest.fn(async ({ data }: any) => {
      this._justifs.push({ id: this._justifs.length + 1, ...data });
    }),
  } as any;

  child = {
    findMany: jest.fn(async () => this._children),
  } as any;

  // emulate transaction passthrough
  $transaction = jest.fn().mockImplementation(async (fn: any) => fn(this));
}

/* ------------------------- Tests ------------------------- */
describe('PresenceService', () => {
  let svc: PresenceService;
  let prisma: PrismaMock;

  beforeEach(() => {
    prisma = new PrismaMock();
    svc = new PresenceService(prisma as unknown as PrismaService);
  });

  it('createSheet génère la feuille et les records manquants', async () => {
    const date = '2100-01-01';
    const sheet = await svc.createSheet(date, 'staff1');

    // une nouvelle feuille + 2 records créés
    expect(prisma.presenceSheet.upsert).toHaveBeenCalled();
    expect(prisma.presenceRecord.createMany).toHaveBeenCalled();
    expect(sheet.records).toHaveLength(2);
  });

  it('validateSheet refuse si la feuille est inconnue', async () => {
    await expect(svc.validateSheet(999, [], 'staff')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('validateSheet refuse si statut ≠ PENDING_STAFF', async () => {
    // crée feuille puis change statut manuellement
    const date = '2100-02-01';
    const sheet = await svc.createSheet(date, 's');
    prisma._sheets[0].status = 'VALIDATED';
    await expect(svc.validateSheet(sheet.id, [], 's')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('validateSheet met à jour les records et passe en PENDING_SECRETARY', async () => {
    const date = '2100-03-01';
    const sheet = await svc.createSheet(date, 's1');

    const res = await svc.validateSheet(sheet.id, [1], 's1');

    expect(prisma.presenceRecord.deleteMany).toHaveBeenCalledWith({ where: { sheetId: sheet.id } });
    expect(prisma.presenceRecord.createMany).toHaveBeenCalled();
    expect(res.status).toBe('PENDING_SECRETARY');
    expect(res.records.find((r: any) => r.childId === 1).present).toBe(true);
  });

  it('justify refuse si record introuvable ou présent', async () => {
    await expect(svc.justify(123, { type: JustificationType.ABSENCE, justificationDate: '2100-01-01' } as any)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('justify crée une justification et valide la feuille quand tout est justifié', async () => {
    const date = '2100-04-01';
    const sheet = await svc.createSheet(date, 's');
    // marquer tous absents pour test
    const recIds = prisma._records.map((r) => r.id);

    // justifie premier record
    await svc.justify(recIds[0], { type: JustificationType.ABSENCE, justificationDate: '2100-04-01', motif: 'Malade' } as any);
    expect(prisma.absenceJustification.create).toHaveBeenCalled();

    // feuille doit encore être PENDING_SECRETARY (1 absence restante non justifiée)
    const after1 = await svc.findByDate(date);
    expect(after1.status).toBe('PENDING_SECRETARY');

    // justifie deuxième record
    await svc.justify(recIds[1], { type: JustificationType.LATENESS, justificationDate: '2100-04-01' } as any);
    const final = await svc.findByDate(date);
    expect(final.status).toBe('VALIDATED');
  });
}); 