import { ArgumentsHost, BadRequestException } from '@nestjs/common';

import { HttpExceptionFilter } from './http-exception.filter';

describe('HttpExceptionFilter', () => {
  function createHost() {
    const response = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const request = {
      url: '/api/v1/test',
    };
    const host = {
      switchToHttp: () => ({
        getResponse: () => response,
        getRequest: () => request,
      }),
    } as unknown as ArgumentsHost;

    return { host, response };
  }

  it('formats expected HTTP exceptions', () => {
    const filter = new HttpExceptionFilter();
    const { host, response } = createHost();

    filter.catch(new BadRequestException('Invalid payload'), host);

    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Invalid payload',
        path: '/api/v1/test',
        timestamp: expect.any(String),
      }),
    );
  });

  it('formats unexpected errors as internal server errors', () => {
    const filter = new HttpExceptionFilter();
    const { host, response } = createHost();

    filter.catch(new Error('database details'), host);

    expect(response.status).toHaveBeenCalledWith(500);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 500,
        error: 'INTERNAL_SERVER_ERROR',
        message: 'Unexpected error',
        path: '/api/v1/test',
      }),
    );
  });
});
