import {
  INestApplication,
  RequestMethod,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Server } from 'node:http';
import * as request from 'supertest';

import { AppModule } from '../src/app.module';

process.env.DATABASE_URL ??=
  'postgresql://support_desk:support_desk_password@localhost:5432/support_desk?schema=public';
process.env.JWT_ACCESS_SECRET ??= 'test_access_secret_with_32_chars';
process.env.JWT_ACCESS_EXPIRES_IN ??= '15m';

describe('Health endpoint', () => {
  let app: INestApplication;

  beforeAll(async () => {
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
    const password = 'Password123!';

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
});
