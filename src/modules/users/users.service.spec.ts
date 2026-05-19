import { ForbiddenException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

import { UsersService } from './users.service';

describe('UsersService', () => {
  const now = new Date('2026-05-19T12:00:00.000Z');
  const user = {
    id: 'user-id',
    name: 'Customer Test',
    email: 'customer@example.com',
    passwordHash: '$2b$10$hash',
    role: 'CUSTOMER',
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('blocks non-admin users from reading another user', async () => {
    const service = new UsersService({} as never);

    await expect(
      service.getUserById('other-user-id', {
        sub: 'user-id',
        email: 'customer@example.com',
        role: UserRole.CUSTOMER,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('creates an agent without returning password hash', async () => {
    jest.spyOn(bcrypt, 'hash').mockResolvedValue('$2b$10$hash' as never);

    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ ...user, role: 'AGENT' }),
      },
    };
    const service = new UsersService(prisma as never);

    await expect(
      service.createAgent({
        name: 'Agent Test',
        email: 'AGENT@example.com',
        password: 'Password123!',
      }),
    ).resolves.toEqual({
      id: user.id,
      name: user.name,
      email: user.email,
      role: 'AGENT',
      isActive: true,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    });
    expect(prisma.user.create).toHaveBeenCalledWith({
      data: {
        name: 'Agent Test',
        email: 'agent@example.com',
        passwordHash: '$2b$10$hash',
        role: 'AGENT',
      },
    });
  });
});
