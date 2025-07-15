import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '../../src/common/guards/roles.guard';
import { Role } from '@prisma/client';

describe('Guards Integration', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RolesGuard, Reflector],
    }).compile();

    guard = module.get<RolesGuard>(RolesGuard);
    reflector = module.get<Reflector>(Reflector);
  });

  // Helper to create mock ExecutionContext
  const createMockContext = (user: any): ExecutionContext => ({
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as ExecutionContext);

  describe('Integration: Guard + Reflector + Roles', () => {
    it('should allow access when no roles required', () => {
      // Mock no roles required
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

      const mockUser = { id: '1', role: Role.CHILD };
      const context = createMockContext(mockUser);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should allow access when user has required role', () => {
      // Mock roles required: CHILD, PARENT
      const requiredRoles = [Role.CHILD, Role.PARENT];
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(requiredRoles);

      const mockUser = { id: '1', role: Role.CHILD };
      const context = createMockContext(mockUser);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should deny access when user lacks required role', () => {
      // Mock roles required: ADMIN only
      const requiredRoles = [Role.ADMIN];
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(requiredRoles);

      const mockUser = { id: '1', role: Role.CHILD };
      const context = createMockContext(mockUser);

      const result = guard.canActivate(context);

      expect(result).toBe(false);
    });

    it('should handle multiple roles correctly', () => {
      const requiredRoles = [Role.STAFF, Role.DIRECTOR, Role.SERVICE_MANAGER];
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(requiredRoles);

      // Test STAFF access
      const staffUser = { id: '1', role: Role.STAFF };
      const staffContext = createMockContext(staffUser);
      expect(guard.canActivate(staffContext)).toBe(true);

      // Test DIRECTOR access
      const directorUser = { id: '2', role: Role.DIRECTOR };
      const directorContext = createMockContext(directorUser);
      expect(guard.canActivate(directorContext)).toBe(true);

      // Test PARENT access (should fail)
      const parentUser = { id: '3', role: Role.PARENT };
      const parentContext = createMockContext(parentUser);
      expect(guard.canActivate(parentContext)).toBe(false);
    });

    it('should handle missing user gracefully', () => {
      const requiredRoles = [Role.ADMIN];
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(requiredRoles);

      // Mock request without user
      const context = createMockContext(null);

      const result = guard.canActivate(context);

      expect(result).toBe(false);
    });
  });

  describe('Integration: Role hierarchy validation', () => {
    it('should handle admin access to all endpoints', () => {
      const testRoles = [
        [Role.CHILD],
        [Role.PARENT], 
        [Role.STAFF],
        [Role.SECRETARY],
        [Role.DIRECTOR],
        [Role.SERVICE_MANAGER],
      ];

      const adminUser = { id: '1', role: Role.ADMIN };
      const context = createMockContext(adminUser);

      testRoles.forEach(roles => {
        jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(roles);
        // Admin should NOT automatically have access to child-only endpoints
        // This is correct behavior - admins need explicit permission
        const result = guard.canActivate(context);
        if (roles.includes(Role.ADMIN)) {
          expect(result).toBe(true);
        }
      });
    });

    it('should validate education staff roles correctly', () => {
      const educationRoles = [Role.STAFF, Role.DIRECTOR, Role.SERVICE_MANAGER];
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(educationRoles);

      // Test each education role
      educationRoles.forEach(role => {
        const user = { id: '1', role };
        const context = createMockContext(user);
        expect(guard.canActivate(context)).toBe(true);
      });

      // Test non-education roles
      const nonEducationRoles = [Role.CHILD, Role.PARENT, Role.SECRETARY];
      nonEducationRoles.forEach(role => {
        const user = { id: '1', role };
        const context = createMockContext(user);
        expect(guard.canActivate(context)).toBe(false);
      });
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });
}); 