import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';

import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  function createContext(role?: UserRole) {
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({
          user: role
            ? {
                sub: 'user-id',
                email: 'user@example.com',
                role,
              }
            : undefined,
        }),
      }),
    } as unknown as ExecutionContext;
  }

  it('allows requests when no role metadata is required', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(undefined),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(guard.canActivate(createContext())).toBe(true);
  });

  it('allows users with an accepted role', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue([UserRole.ADMIN]),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(guard.canActivate(createContext(UserRole.ADMIN))).toBe(true);
  });

  it('blocks users without an accepted role', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue([UserRole.ADMIN]),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(guard.canActivate(createContext(UserRole.CUSTOMER))).toBe(false);
  });
});
