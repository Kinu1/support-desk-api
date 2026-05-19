import { HealthService } from './health.service';

describe('HealthService', () => {
  it('returns the API health status', () => {
    const service = new HealthService();

    expect(service.getHealth()).toEqual({
      status: 'ok',
      service: 'support-desk-api',
      timestamp: expect.any(String),
    });
  });
});
