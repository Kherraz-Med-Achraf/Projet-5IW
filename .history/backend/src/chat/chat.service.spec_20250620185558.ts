import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ChatService } from './chat.service';
import { PrismaService } from '../prisma/prisma.service';
import { Model, Types } from 'mongoose';
import { Chat } from './schemas/chat.schema';
import { Message } from './schemas/message.schema';

// -------------------- Mocks utilitaires --------------------
class ChatModelMock {
  docs: any[] = [];
  create = jest.fn((data: any) => {
    const doc = { _id: new Types.ObjectId(), updatedAt: new Date(), ...data };
    this.docs.push(doc);
    return doc;
  });
  findById = jest.fn((id: string) => ({ exec: () => this.docs.find(d => d._id.toString() === id) }));
  findByIdAndUpdate = jest.fn();
}

class MsgModelMock {
  msgs: any[] = [];
  create = jest.fn((data: any) => {
    const m = { id: new Types.ObjectId().toString(), sentAt: new Date(), ...data };
    this.msgs.push(m);
    return m;
  });
  findById = jest.fn((id: string) => ({ exec: () => this.msgs.find(m => m.id === id) }));
  deleteOne = jest.fn();
}

class PrismaMock {
  user = { findUnique: jest.fn(), findMany: jest.fn() } as any;
  child = { findMany: jest.fn() } as any;
}

// Helper pour créer un service avec les mocks
function makeService() {
  const chatModel = new ChatModelMock() as unknown as Model<Chat>;
  const msgModel  = new MsgModelMock()  as unknown as Model<Message>;
  const prisma    = new PrismaMock()    as unknown as PrismaService;
  const svc       = new ChatService(chatModel, msgModel, prisma);
  return { svc, chatModel, msgModel, prisma };
}

// -------------------- Tests --------------------

describe('ChatService – règles d’autorisation isAllowed()', () => {
  const { svc } = makeService();
  const ok = [
    ['DIRECTOR',        'STAFF'],
    ['DIRECTOR',        'SECRETARY'],
    ['SERVICE_MANAGER', 'DIRECTOR'],
    ['SECRETARY',       'STAFF'],
  ] as const;
  it.each(ok)('%s peut parler à %s', (a, b) => {
    expect((svc as any).isAllowed(a, b)).toBe(true);
  });

  const ko = [
    ['PARENT', 'DIRECTOR'],
    ['CHILD',  'STAFF'],
  ] as const;
  it.each(ko)('%s ne peut pas parler à %s', (a, b) => {
    expect((svc as any).isAllowed(a, b)).toBe(false);
  });
});

describe('ChatService – createChat & createMessage', () => {
  let svc: ChatService; let chatModel: any; let msgModel: any; let prisma: any;
  beforeEach(() => {
    const obj = makeService();
    svc=obj.svc; chatModel=obj.chatModel; msgModel=obj.msgModel; prisma=obj.prisma;
  });

  it('refuse qu’un PARENT crée un chat avec un autre PARENT', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'other', role: 'PARENT' });
    await expect(svc.createChat(['other'], 'me', 'PARENT')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('autorise DIRECTOR -> STAFF et enregistre le chat', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'staff1', role: 'STAFF' });
    const chat = await svc.createChat(['staff1'], 'director1', 'DIRECTOR');
    expect(chatModel.create).toHaveBeenCalled();
    expect(chat.participants).toContain('staff1');
  });

  it('enregistre un message et met à jour updatedAt', async () => {
    // crée d’abord un chat valide
    prisma.user.findUnique.mockResolvedValue({ id: 'staff1', role: 'STAFF' });
    const chat: any = await svc.createChat(['staff1'], 'director1', 'DIRECTOR');
    // autorise l’accès
    const saved = await svc.createMessage(chat._id.toString(), 'staff1', 'hello');
    expect(msgModel.create).toHaveBeenCalled();
    expect(saved.content).toBe('hello');
    expect(chatModel.findByIdAndUpdate).toHaveBeenCalled();
  });

  it('empêche un utilisateur hors chat de poster un message', async () => {
    const fakeChatId = new Types.ObjectId().toString();
    (chatModel as any).docs.push({ _id: fakeChatId, participants: ['userA'] });
    await expect(svc.createMessage(fakeChatId, 'intrus', 'oops')).rejects.toBeInstanceOf(ForbiddenException);
  });
}); 