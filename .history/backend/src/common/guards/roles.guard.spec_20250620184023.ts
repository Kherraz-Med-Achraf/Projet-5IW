import { ExecutionContext } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { RolesGuard } from './roles.guard'
import { Role } from '@prisma/client'

const reflector = new Reflector()
const guard     = new RolesGuard(reflector)

// Fabrique un ExecutionContext minimal avec un utilisateur donné
afterEach(() => jest.restoreAllMocks())

function ctxWithRole(role: Role): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user: { role } }),
    }),
    getHandler:   () => ({}),
    getClass:     () => ({}),
  } as unknown as ExecutionContext
}

/**
 * Ce test unitaire isole le RolesGuard pour vérifier qu'il contrôle correctement
 * l'accès aux routes « création / modification / suppression d'événement ».
 * Ces routes sont décorées par @Roles(DIRECTOR, SERVICE_MANAGER) dans EventController.
 */
describe('RolesGuard – accès gestion Événements (CRUD)', () => {
  const allowed = [Role.DIRECTOR, Role.SERVICE_MANAGER]

  beforeEach(() => {
    jest.spyOn(reflector, 'get').mockReturnValue(allowed)
  })

  it.each(allowed)('autorise l\'accès Event CRUD pour le rôle %s', (role) => {
    expect(guard.canActivate(ctxWithRole(role))).toBe(true)
  })

  it.each([Role.STAFF, Role.PARENT, Role.SECRETARY])('refuse l\'accès Event CRUD pour le rôle %s', (role) => {
    expect(guard.canActivate(ctxWithRole(role))).toBe(false)
  })
}) 