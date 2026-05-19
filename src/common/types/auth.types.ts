import { Request } from 'express';
import { UserRole } from '@prisma/client';

export type AuthenticatedUser = {
  sub: string;
  email: string;
  role: UserRole;
};

export type JwtPayload = AuthenticatedUser;

export type AuthenticatedRequest = Request & {
  user: AuthenticatedUser;
};
