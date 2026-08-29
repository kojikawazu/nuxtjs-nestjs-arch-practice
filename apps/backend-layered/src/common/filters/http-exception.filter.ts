import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import type { ApiError, ValidationError } from '@app/api-client';

/**
 * すべての例外を契約 (ApiError) の形に統一して返すフィルタ。
 * 既知の HttpException はそのステータスを、未知のエラーは 500 を返す。
 * 検証失敗（422）は Pipe / UseCase が errors を載せて投げるため、ここではそのまま通す。
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    let message = 'Internal server error';
    let error: string | undefined;
    let errors: ValidationError[] | undefined;

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
        errors = toValidationErrors(record.errors);
      }
    } else {
      this.logger.error(exception);
    }

    const payload: ApiError = { statusCode: status, message, error, errors };
    response.status(status).json(payload);
  }
}

/**
 * HttpException のレスポンスボディに載っている errors を契約の形として取り出す。
 * ボディは任意の値を入れられる（Nest の型は unknown）ため、形が合うものだけ通す。
 */
function toValidationErrors(value: unknown): ValidationError[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const valid = value.filter(
    (item): item is ValidationError =>
      typeof item === 'object' &&
      item !== null &&
      typeof (item as ValidationError).field === 'string' &&
      Array.isArray((item as ValidationError).messages),
  );
  return valid.length > 0 ? valid : undefined;
}
