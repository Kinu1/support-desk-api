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
});
