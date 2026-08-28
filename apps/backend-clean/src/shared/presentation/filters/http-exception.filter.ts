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
import { DomainError, type DomainErrorKind } from '../../domain/errors/domain-error';

/** ドメインエラーの分類 → HTTP ステータス（presentation 境界での翻訳）。 */
const STATUS_BY_DOMAIN_KIND: Readonly<Record<DomainErrorKind, HttpStatus>> = {
  not_found: HttpStatus.NOT_FOUND,
  forbidden: HttpStatus.FORBIDDEN,
  invalid: HttpStatus.BAD_REQUEST,
  conflict: HttpStatus.CONFLICT,
  unauthorized: HttpStatus.UNAUTHORIZED,
};

/**
 * すべての例外を契約 (ApiError) の形に統一して返すフィルタ。
 * - DomainError: kind に応じた 404/403/400 に翻訳する（ドメインは HTTP を知らないため）。
 * - HttpException: そのステータスを使う。
 * - それ以外: 500。
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception instanceof DomainError) {
      const status = STATUS_BY_DOMAIN_KIND[exception.kind];
      const payload: ApiError = { statusCode: status, message: exception.message };
      response.status(status).json(payload);
      return;
    }

    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

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
