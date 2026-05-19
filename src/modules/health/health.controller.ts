import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { HealthService } from './health.service';

@ApiTags('health')
@Controller({
  path: 'health',
  version: VERSION_NEUTRAL,
})
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOkResponse({
    description: 'API health status.',
    schema: {
      example: {
        status: 'ok',
        service: 'support-desk-api',
        timestamp: '2026-05-19T12:00:00.000Z',
      },
    },
  })
  getHealth() {
    return this.healthService.getHealth();
  }
}
