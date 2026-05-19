import {
  INestApplication,
  RequestMethod,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { Server } from 'node:http';
import * as request from 'supertest';

import { AppModule } from '../src/app.module';

process.env.DATABASE_URL ??=
  'postgresql://support_desk:support_desk_password@localhost:5432/support_desk?schema=public';
process.env.JWT_ACCESS_SECRET ??= 'test_access_secret_with_32_chars';
process.env.JWT_ACCESS_EXPIRES_IN ??= '15m';

describe('Health endpoint', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  const password = 'Password123!';

  beforeAll(async () => {
    prisma = new PrismaClient();
    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.user.upsert({
      where: { email: 'admin.e2e@supportdesk.test' },
      update: { passwordHash, role: UserRole.ADMIN, isActive: true },
      create: {
        name: 'Admin E2E',
        email: 'admin.e2e@supportdesk.test',
        passwordHash,
        role: UserRole.ADMIN,
      },
    });

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api', {
      exclude: [{ path: 'health', method: RequestMethod.GET }],
    });
    app.enableVersioning({
      type: VersioningType.URI,
      defaultVersion: '1',
    });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
    await prisma?.$disconnect();
  });

  it('GET /health', async () => {
    const server = app.getHttpServer() as Server;

    await request(server)
      .get('/health')
      .expect(200)
      .expect(({ body }) => {
        expect(body.status).toBe('ok');
        expect(body.service).toBe('support-desk-api');
        expect(body.database).toBe('ok');
        expect(body.timestamp).toEqual(expect.any(String));
      });
  });

  it('registers, authenticates and returns the current user', async () => {
    const email = `customer.${Date.now()}@example.com`;

    const registerResponse = await request(app.getHttpServer() as Server)
      .post('/api/v1/auth/register-customer')
      .send({
        name: 'Customer Test',
        email,
        password,
      })
      .expect(201);

    expect(registerResponse.body.accessToken).toEqual(expect.any(String));
    expect(registerResponse.body.user).toMatchObject({
      email,
      role: 'CUSTOMER',
      isActive: true,
    });
    expect(registerResponse.body.user.passwordHash).toBeUndefined();

    const loginResponse = await request(app.getHttpServer() as Server)
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(200);

    await request(app.getHttpServer() as Server)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${loginResponse.body.accessToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.email).toBe(email);
        expect(body.passwordHash).toBeUndefined();
      });
  });

  it('rejects invalid credentials and missing access token', async () => {
    await request(app.getHttpServer() as Server)
      .post('/api/v1/auth/login')
      .send({
        email: 'customer@supportdesk.test',
        password: 'wrong-password',
      })
      .expect(401);

    await request(app.getHttpServer() as Server).get('/api/v1/auth/me').expect(401);
  });

  it('enforces admin-only user management permissions', async () => {
    const server = app.getHttpServer() as Server;
    const agentEmail = `agent.${Date.now()}@example.com`;
    const customerEmail = `customer.permissions.${Date.now()}@example.com`;

    const adminLogin = await request(server)
      .post('/api/v1/auth/login')
      .send({
        email: 'admin.e2e@supportdesk.test',
        password,
      })
      .expect(200);
    const adminToken = adminLogin.body.accessToken as string;
    const adminId = adminLogin.body.user.id as string;

    const customerRegister = await request(server)
      .post('/api/v1/auth/register-customer')
      .send({
        name: 'Customer Permissions',
        email: customerEmail,
        password,
      })
      .expect(201);
    const customerToken = customerRegister.body.accessToken as string;
    const customerId = customerRegister.body.user.id as string;

    await request(server)
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(403);

    const agentResponse = await request(server)
      .post('/api/v1/users/agents')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Agent Permissions',
        email: agentEmail,
        password,
      })
      .expect(201);
    const agentId = agentResponse.body.id as string;

    expect(agentResponse.body).toMatchObject({
      email: agentEmail,
      role: 'AGENT',
      isActive: true,
    });
    expect(agentResponse.body.passwordHash).toBeUndefined();

    await request(server)
      .get(`/api/v1/users/${customerId}`)
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(200);

    await request(server)
      .get(`/api/v1/users/${agentId}`)
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(403);

    const usersResponse = await request(server)
      .get('/api/v1/users?role=AGENT&isActive=true&page=1&limit=10')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(usersResponse.body.data).toEqual(
      expect.arrayContaining([expect.objectContaining({ email: agentEmail })]),
    );
    expect(usersResponse.body.meta.total).toBeGreaterThanOrEqual(1);

    await request(server)
      .patch(`/api/v1/users/${adminId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isActive: false })
      .expect(400);

    await request(server)
      .patch(`/api/v1/users/${agentId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isActive: false })
      .expect(200)
      .expect(({ body }) => {
        expect(body.isActive).toBe(false);
        expect(body.passwordHash).toBeUndefined();
      });

    await request(server)
      .post('/api/v1/auth/login')
      .send({ email: agentEmail, password })
      .expect(401);
  });

  it('manages tickets with customer, agent and admin permissions', async () => {
    const server = app.getHttpServer() as Server;
    const stamp = Date.now();
    const customerEmail = `customer.ticket.${stamp}@example.com`;
    const otherCustomerEmail = `customer.other-ticket.${stamp}@example.com`;
    const agentEmail = `agent.ticket.${stamp}@example.com`;

    const adminLogin = await request(server)
      .post('/api/v1/auth/login')
      .send({
        email: 'admin.e2e@supportdesk.test',
        password,
      })
      .expect(200);
    const adminToken = adminLogin.body.accessToken as string;

    const agentResponse = await request(server)
      .post('/api/v1/users/agents')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Agent Ticket',
        email: agentEmail,
        password,
      })
      .expect(201);
    const agentId = agentResponse.body.id as string;

    const agentLogin = await request(server)
      .post('/api/v1/auth/login')
      .send({ email: agentEmail, password })
      .expect(200);
    const agentToken = agentLogin.body.accessToken as string;

    const customerRegister = await request(server)
      .post('/api/v1/auth/register-customer')
      .send({
        name: 'Customer Ticket',
        email: customerEmail,
        password,
      })
      .expect(201);
    const customerToken = customerRegister.body.accessToken as string;

    const otherCustomerRegister = await request(server)
      .post('/api/v1/auth/register-customer')
      .send({
        name: 'Other Customer Ticket',
        email: otherCustomerEmail,
        password,
      })
      .expect(201);
    const otherCustomerToken = otherCustomerRegister.body.accessToken as string;

    const ticketResponse = await request(server)
      .post('/api/v1/tickets')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        title: 'Nao consigo acessar o painel',
        description: 'O login retorna erro mesmo com a senha correta.',
        category: 'access',
        priority: 'HIGH',
      })
      .expect(201);
    const ticketId = ticketResponse.body.id as string;

    expect(ticketResponse.body).toMatchObject({
      status: 'OPEN',
      priority: 'HIGH',
      category: 'access',
      agentId: null,
    });

    await request(server)
      .post('/api/v1/tickets')
      .set('Authorization', `Bearer ${agentToken}`)
      .send({
        title: 'Agente tentando criar ticket',
        description: 'Agente nao deve criar ticket de cliente.',
        category: 'access',
      })
      .expect(403);

    await request(server)
      .get(`/api/v1/tickets/${ticketId}`)
      .set('Authorization', `Bearer ${otherCustomerToken}`)
      .expect(403);

    const agentUpdate = await request(server)
      .patch(`/api/v1/tickets/${ticketId}`)
      .set('Authorization', `Bearer ${agentToken}`)
      .send({
        status: 'IN_PROGRESS',
        priority: 'URGENT',
      })
      .expect(200);

    expect(agentUpdate.body).toMatchObject({
      id: ticketId,
      status: 'IN_PROGRESS',
      priority: 'URGENT',
      agentId,
    });

    const agentList = await request(server)
      .get('/api/v1/tickets?status=IN_PROGRESS&page=1&limit=10')
      .set('Authorization', `Bearer ${agentToken}`)
      .expect(200);

    expect(agentList.body.data).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: ticketId })]),
    );

    const adminUpdate = await request(server)
      .patch(`/api/v1/tickets/${ticketId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        status: 'RESOLVED',
        agentId,
      })
      .expect(200);

    expect(adminUpdate.body.status).toBe('RESOLVED');
    expect(adminUpdate.body.resolvedAt).toEqual(expect.any(String));

    const adminList = await request(server)
      .get(`/api/v1/tickets?customerId=${customerRegister.body.user.id}&page=1&limit=10`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(adminList.body.data).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: ticketId })]),
    );
  });
});
