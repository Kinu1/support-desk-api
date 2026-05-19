import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

import { AuthService } from './auth.service';

describe('AuthService', () => {
  const now = new Date('2026-05-19T12:00:00.000Z');
  const user = {
    id: 'user-id',
    name: 'Customer Test',
    email: 'customer@example.com',
    passwordHash: '$2b$10$hash',
    role: UserRole.CUSTOMER,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };

  const jwtService = {
    signAsync: jest.fn().mockResolvedValue('access-token'),
  } as unknown as JwtService;

  const configService = {
    getOrThrow: jest.fn((key: string) => {
      const values: Record<string, string> = {
        'jwt.accessSecret': 'test_access_secret_with_32_chars',
        'jwt.accessExpiresIn': '15m',
      };

      return values[key];
    }),
  } as unknown as ConfigService;

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns an access token without leaking password hash on login', async () => {
    jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);

    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue(user),
      },
    };
    const service = new AuthService(prisma as never, jwtService, configService);

    await expect(
      service.login({
        email: 'CUSTOMER@example.com',
        password: 'Password123!',
      }),
    ).resolves.toEqual({
      accessToken: 'access-token',
      tokenType: 'Bearer',
      expiresIn: '15m',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      },
    });
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'customer@example.com' },
    });
  });

  it('registers a customer with normalized email', async () => {
    jest.spyOn(bcrypt, 'hash').mockResolvedValue('$2b$10$new-hash' as never);

    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({
          ...user,
          email: 'new@example.com',
          passwordHash: '$2b$10$new-hash',
        }),
      },
    };
    const service = new AuthService(prisma as never, jwtService, configService);

    await expect(
      service.registerCustomer({
        name: 'New Customer',
        email: 'NEW@example.com',
        password: 'Password123!',
      }),
    ).resolves.toMatchObject({
      accessToken: 'access-token',
      user: {
        email: 'new@example.com',
        role: UserRole.CUSTOMER,
      },
    });
    expect(prisma.user.create).toHaveBeenCalledWith({
      data: {
        name: 'New Customer',
        email: 'new@example.com',
        passwordHash: '$2b$10$new-hash',
        role: UserRole.CUSTOMER,
      },
    });
  });

  it('rejects duplicated customer email on registration', async () => {
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({ id: 'existing-id' }),
      },
    };
    const service = new AuthService(prisma as never, jwtService, configService);

    await expect(
      service.registerCustomer({
        name: 'Existing Customer',
        email: 'customer@example.com',
        password: 'Password123!',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects inactive users on login and me lookup', async () => {
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({ ...user, isActive: false }),
      },
    };
    const service = new AuthService(prisma as never, jwtService, configService);

    await expect(
      service.login({
        email: 'customer@example.com',
        password: 'Password123!',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(service.me('user-id')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
