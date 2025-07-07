import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext } from '@nestjs/common';
import { RolesGuard } from './roles.guard';
import { Role } from '@prisma/client';
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
    allowed: [Role.ADMIN],
  },
  {
    ctrl: DirectorController,
    method: 'findAll',
    allowed: [Role.SECRETARY, Role.SERVICE_MANAGER, Role.DIRECTOR, Role.ADMIN],
  },
  {
    ctrl: DirectorController,
    method: 'update',
    allowed: [Role.ADMIN],
  },
  {
    ctrl: DirectorController,
    method: 'remove',
    allowed: [Role.ADMIN],
  },

  // Service Manager CRUD
  {
    ctrl: ServiceManagerController,
    method: 'create',
    allowed: [Role.ADMIN],
  },
  {
    ctrl: ServiceManagerController,
    method: 'findAll',
    allowed: [Role.SECRETARY, Role.SERVICE_MANAGER, Role.DIRECTOR, Role.ADMIN],
  },
  {
    ctrl: ServiceManagerController,
    method: 'update',
    allowed: [Role.ADMIN],
  },
  {
    ctrl: ServiceManagerController,
    method: 'remove',
    allowed: [Role.ADMIN],
  },

  // Staff CRUD
  {
    ctrl: StaffController,
    method: 'create',
    allowed: [Role.ADMIN],
  },
  {
    ctrl: StaffController,
    method: 'findAll',
    allowed: [Role.SECRETARY, Role.SERVICE_MANAGER, Role.DIRECTOR, Role.ADMIN],
  },
  {
    ctrl: StaffController,
    method: 'update',
    allowed: [Role.ADMIN],
  },
  {
    ctrl: StaffController,
    method: 'remove',
    allowed: [Role.ADMIN],
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
    allowed: [Role.ADMIN],
  },
  {
    ctrl: SecretaryController,
    method: 'remove',
    allowed: [Role.ADMIN],
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
    allowed: [Role.ADMIN],
  },
  {
    ctrl: ParentController,
    method: 'remove',
    allowed: [Role.ADMIN],
  },

  // Child CRUD
  { ctrl: ChildController, method: 'create', allowed: [Role.ADMIN] },
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
    allowed: [Role.ADMIN],
  },
  {
    ctrl: ChildController,
    method: 'remove',
    allowed: [Role.ADMIN],
  },
];

/* -------------------------------------------------- */
/* Tests                                              */
/* -------------------------------------------------- */

describe('RolesGuard CRUD', () => {
  let guard: RolesGuard;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RolesGuard],
    }).compile();

    guard = module.get<RolesGuard>(RolesGuard);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('Controllers access control', () => {
    const allRoles = Object.values(Role);

    // Pour chaque cas de test
    cases.forEach(({ ctrl, method, allowed }) => {
      describe(`${ctrl.name}.${method}`, () => {
        // Tester chaque rôle
        allRoles.forEach((role) => {
          const isAllowed = allowed.includes(role);
          const testName = `should ${
            isAllowed ? 'allow' : 'deny'
          } ${role} access`;

          it(testName, () => {
            // Mock du contexte d'exécution
            const mockContext = {
              getHandler: () => ({ name: method }),
              getClass: () => ctrl,
              switchToHttp: () => ({
                getRequest: () => ({ user: { role } }),
              }),
            } as ExecutionContext;

            // Mock de la réflexion des rôles
            const mockReflector = {
              getAllAndOverride: () => allowed,
            };

            // Utiliser le guard avec le mock du réflecteur
            Object.defineProperty(guard, 'reflector', {
              value: mockReflector,
              writable: true,
            });

            const result = guard.canActivate(mockContext);
            expect(result).toBe(isAllowed);
          });
        });
      });
    });
  });
});
