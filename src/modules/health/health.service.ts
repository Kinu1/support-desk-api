import { Injectable } from '@nestjs/common';

@Injectable()
export class HealthService {
  getHealth() {
    return {
      status: 'ok',
      service: 'support-desk-api',
      timestamp: new Date().toISOString(),
    };
  }
}
