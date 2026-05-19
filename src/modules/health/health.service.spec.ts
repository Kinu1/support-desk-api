import { HealthService } from './health.service';

describe('HealthService', () => {
  it('returns the API health status', async () => {
    const prisma = {
      $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
    };
    const service = new HealthService(prisma as never);

    await expect(service.getHealth()).resolves.toEqual({
      status: 'ok',
      service: 'support-desk-api',
      database: 'ok',
      timestamp: expect.any(String),
    });
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
  });
});
