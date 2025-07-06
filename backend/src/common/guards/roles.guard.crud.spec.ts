import { Role } from '@prisma/client';
import { ExecutionContext } from '@nestjs/common';
import { RolesGuard } from './roles.guard';
import { Reflector } from '@nestjs/core';

import { DirectorController } from '../../director/director.controller';
import { ServiceManagerController } from '../../service-manager/service-manager.controller';
import { StaffController } from '../../staff/staff.controller';
import { SecretaryController } from '../../secretary/secretary.controller';
import { ParentController } from '../../parent/parent.controller';
import { ChildController } from '../../child/child.controller';
import { ROLES_KEY } from '../decorators/roles.decorator';

/* -------------------------------------------------- */
/* util mock ExecutionContext                          */
/* -------------------------------------------------- */
function mockCtx(role: Role): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user: { role } }) }) as any,
    getHandler: () => undefined,
    getClass: () => undefined,
  } as unknown as ExecutionContext;
}

/* -------------------------------------------------- */
/* Tableau des cas à tester                            */
/* -------------------------------------------------- */
interface Case {
  ctrl: any;
  method: string;
  allowed: Role[];
}

const cases: Case[] = [
  // Director CRUD
  {
    ctrl: DirectorController,
    method: 'create',
    allowed: [Role.DIRECTOR, Role.ADMIN],
  },
  {
    ctrl: DirectorController,
    method: 'findAll',
    allowed: [Role.SECRETARY, Role.SERVICE_MANAGER, Role.DIRECTOR, Role.ADMIN],
  },
  {
    ctrl: DirectorController,
    method: 'update',
    allowed: [Role.DIRECTOR, Role.ADMIN],
  },
  {
    ctrl: DirectorController,
    method: 'remove',
    allowed: [Role.DIRECTOR, Role.ADMIN],
  },

  // Service Manager CRUD
  {
    ctrl: ServiceManagerController,
    method: 'create',
    allowed: [Role.ADMIN, Role.DIRECTOR, Role.SERVICE_MANAGER],
  },
  {
    ctrl: ServiceManagerController,
    method: 'findAll',
    allowed: [Role.SECRETARY, Role.SERVICE_MANAGER, Role.DIRECTOR, Role.ADMIN],
  },
  {
    ctrl: ServiceManagerController,
    method: 'update',
    allowed: [Role.SERVICE_MANAGER, Role.DIRECTOR, Role.ADMIN],
  },
  {
    ctrl: ServiceManagerController,
    method: 'remove',
    allowed: [Role.DIRECTOR, Role.ADMIN],
  },

  // Staff CRUD
  {
    ctrl: StaffController,
    method: 'create',
    allowed: [Role.SERVICE_MANAGER, Role.DIRECTOR, Role.ADMIN],
  },
  {
    ctrl: StaffController,
    method: 'findAll',
    allowed: [Role.SECRETARY, Role.SERVICE_MANAGER, Role.DIRECTOR, Role.ADMIN],
  },
  {
    ctrl: StaffController,
    method: 'update',
    allowed: [Role.SERVICE_MANAGER, Role.DIRECTOR, Role.ADMIN, Role.STAFF],
  },
  {
    ctrl: StaffController,
    method: 'remove',
    allowed: [Role.SERVICE_MANAGER, Role.DIRECTOR, Role.ADMIN],
  },

  // Secretary CRUD
  { ctrl: SecretaryController, method: 'create', allowed: [Role.ADMIN] },
  {
    ctrl: SecretaryController,
    method: 'findAll',
    allowed: [Role.ADMIN, Role.SECRETARY],
  },
  {
    ctrl: SecretaryController,
    method: 'update',
    allowed: [Role.ADMIN, Role.SECRETARY],
  },
  {
    ctrl: SecretaryController,
    method: 'remove',
    allowed: [Role.ADMIN, Role.SECRETARY],
  },

  // Parent CRUD (pas de create car register) – on teste findOne/update/remove
  {
    ctrl: ParentController,
    method: 'findAll',
    allowed: [Role.SECRETARY, Role.ADMIN, Role.DIRECTOR, Role.SERVICE_MANAGER],
  },
  {
    ctrl: ParentController,
    method: 'update',
    allowed: [
      Role.SECRETARY,
      Role.ADMIN,
      Role.DIRECTOR,
      Role.SERVICE_MANAGER,
      Role.PARENT,
    ],
  },
  {
    ctrl: ParentController,
    method: 'remove',
    allowed: [
      Role.SECRETARY,
      Role.ADMIN,
      Role.DIRECTOR,
      Role.SERVICE_MANAGER,
      Role.PARENT,
    ],
  },

  // Child CRUD (create géré par parent)
  { ctrl: ChildController, method: 'create', allowed: [Role.PARENT] },
  {
    ctrl: ChildController,
    method: 'findAll',
    allowed: [
      Role.PARENT,
      Role.STAFF,
      Role.SECRETARY,
      Role.SERVICE_MANAGER,
      Role.DIRECTOR,
      Role.ADMIN,
    ],
  },
  {
    ctrl: ChildController,
    method: 'update',
    allowed: [Role.PARENT, Role.SERVICE_MANAGER, Role.DIRECTOR, Role.ADMIN],
  },
  {
    ctrl: ChildController,
    method: 'remove',
    allowed: [Role.PARENT, Role.SERVICE_MANAGER, Role.DIRECTOR, Role.ADMIN],
  },
];

/* -------------------------------------------------- */
/* Tests                                              */
/* -------------------------------------------------- */

describe('Roles décorateur & Guard – CRUD profils', () => {
  const reflector = new Reflector();
  const guard = new RolesGuard(reflector);

  it.each(cases)('%s.%s', ({ ctrl, method, allowed }) => {
    const handler = Object.getOwnPropertyDescriptor(
      ctrl.prototype,
      method,
    )!.value;
    const rolesMeta: Role[] = Reflect.getMetadata(ROLES_KEY, handler);
    expect(rolesMeta.sort()).toEqual(allowed.sort());

    // Vérifie le guard dynamiquement
    for (const role of Object.values(Role)) {
      const ctx = mockCtx(role);
      // inject handler & class metadata dans le Reflector context
      jest.spyOn(ctx, 'getHandler').mockReturnValue(handler);
      jest.spyOn(ctx, 'getClass').mockReturnValue(ctrl);
      const can = guard.canActivate(ctx);
      expect(can).toBe(allowed.includes(role as Role));
    }
  });
});
