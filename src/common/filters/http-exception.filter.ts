import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

type ErrorResponse = {
  statusCode: number;
  error: string;
  message: string | string[];
  path: string;
  timestamp: string;
};

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<{ url: string }>();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : null;

    const body = this.buildBody(status, exceptionResponse, request.url);

    response.status(status).json(body);
  }

  private buildBody(
    statusCode: number,
    exceptionResponse: string | object | null,
    path: string,
  ): ErrorResponse {
    if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
      const response = exceptionResponse as Partial<ErrorResponse>;

      return {
        statusCode,
        error: response.error ?? HttpStatus[statusCode] ?? 'Error',
        message: response.message ?? 'Unexpected error',
        path,
        timestamp: new Date().toISOString(),
      };
    }

    return {
      statusCode,
      error: HttpStatus[statusCode] ?? 'Error',
      message:
        typeof exceptionResponse === 'string'
          ? exceptionResponse
          : 'Unexpected error',
      path,
      timestamp: new Date().toISOString(),
    };
  }
}
