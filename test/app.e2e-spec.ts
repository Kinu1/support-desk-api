import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Server } from 'node:http';
import * as request from 'supertest';

import { AppModule } from '../src/app.module';

process.env.DATABASE_URL ??=
  'postgresql://support_desk:support_desk_password@localhost:5432/support_desk?schema=public';

describe('Health endpoint', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
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
});
