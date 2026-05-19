import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
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

  it('lists users with pagination metadata', async () => {
    const prisma = {
      $transaction: jest.fn().mockResolvedValue([[user], 1]),
      user: {
        findMany: jest.fn(),
        count: jest.fn(),
      },
    };
    const service = new UsersService(prisma as never);

    await expect(
      service.listUsers({
        role: UserRole.CUSTOMER,
        isActive: true,
        page: 1,
        limit: 20,
      }),
    ).resolves.toEqual({
      data: [
        {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          isActive: true,
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
        },
      ],
      meta: {
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      },
    });
    expect(prisma.user.findMany).toHaveBeenCalledWith({
      where: { role: UserRole.CUSTOMER, isActive: true },
      orderBy: { createdAt: 'desc' },
      skip: 0,
      take: 20,
    });
  });

  it('allows admins to read any existing user', async () => {
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue(user),
      },
    };
    const service = new UsersService(prisma as never);

    await expect(
      service.getUserById('user-id', {
        sub: 'admin-id',
        email: 'admin@example.com',
        role: UserRole.ADMIN,
      }),
    ).resolves.toMatchObject({ id: 'user-id', email: user.email });
  });

  it('throws not found when user does not exist', async () => {
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
    };
    const service = new UsersService(prisma as never);

    await expect(
      service.getUserById('missing-id', {
        sub: 'admin-id',
        email: 'admin@example.com',
        role: UserRole.ADMIN,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('prevents admins from deactivating their own account', async () => {
    const service = new UsersService({} as never);

    await expect(
      service.updateUserStatus(
        'admin-id',
        { isActive: false },
        {
          sub: 'admin-id',
          email: 'admin@example.com',
          role: UserRole.ADMIN,
        },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('updates another user status', async () => {
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({ id: 'user-id' }),
        update: jest.fn().mockResolvedValue({ ...user, isActive: false }),
      },
    };
    const service = new UsersService(prisma as never);

    await expect(
      service.updateUserStatus(
        'user-id',
        { isActive: false },
        {
          sub: 'admin-id',
          email: 'admin@example.com',
          role: UserRole.ADMIN,
        },
      ),
    ).resolves.toMatchObject({ id: 'user-id', isActive: false });
  });
});
