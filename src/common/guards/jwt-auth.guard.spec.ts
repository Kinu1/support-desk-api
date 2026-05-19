import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';

import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard', () => {
  const configService = {
    getOrThrow: jest.fn().mockReturnValue('test_access_secret_with_32_chars'),
  } as unknown as ConfigService;

  function createContext(authorization?: string) {
    const request = {
      headers: {
        authorization,
      },
    };

    return {
      request,
      context: {
        switchToHttp: () => ({
          getRequest: () => request,
        }),
      } as unknown as ExecutionContext,
    };
  }

  it('attaches the decoded user to the request', async () => {
    const payload = {
      sub: 'user-id',
      email: 'agent@example.com',
      role: UserRole.AGENT,
    };
    const jwtService = {
      verifyAsync: jest.fn().mockResolvedValue(payload),
    } as unknown as JwtService;
    const guard = new JwtAuthGuard(jwtService, configService);
    const { context, request } = createContext('Bearer token');

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request).toMatchObject({ user: payload });
  });

  it('rejects missing bearer token', async () => {
    const jwtService = {
      verifyAsync: jest.fn(),
    } as unknown as JwtService;
    const guard = new JwtAuthGuard(jwtService, configService);
    const { context } = createContext();

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects invalid bearer token', async () => {
    const jwtService = {
      verifyAsync: jest.fn().mockRejectedValue(new Error('invalid')),
    } as unknown as JwtService;
    const guard = new JwtAuthGuard(jwtService, configService);
    const { context } = createContext('Bearer invalid-token');

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
