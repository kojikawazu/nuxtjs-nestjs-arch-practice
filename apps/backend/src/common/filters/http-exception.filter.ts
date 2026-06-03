import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import type { ApiError } from '@app/api-client';

/**
 * すべての例外を契約 (ApiError) の形に統一して返すフィルタ。
 * 既知の HttpException はそのステータスを、未知のエラーは 500 を返す。
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    let message = 'Internal server error';
    let error: string | undefined;

    if (exception instanceof HttpException) {
      const body = exception.getResponse();
      if (typeof body === 'string') {
        message = body;
      } else if (typeof body === 'object' && body !== null) {
        const record = body as Record<string, unknown>;
        const rawMessage = record.message;
        message = Array.isArray(rawMessage)
          ? rawMessage.join(', ')
          : String(rawMessage ?? exception.message);
        error = typeof record.error === 'string' ? record.error : undefined;
      }
    } else {
      this.logger.error(exception);
    }

    const payload: ApiError = { statusCode: status, message, error };
    response.status(status).json(payload);
  }
}
