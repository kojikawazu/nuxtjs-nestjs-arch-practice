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
import { DomainError, type DomainErrorKind } from '../../domain/errors/domain-error';

/** ドメインエラーの分類 → HTTP ステータス（presentation 境界での翻訳）。 */
const STATUS_BY_DOMAIN_KIND: Readonly<Record<DomainErrorKind, HttpStatus>> = {
  not_found: HttpStatus.NOT_FOUND,
  forbidden: HttpStatus.FORBIDDEN,
  // 構文は正しいが意味的に処理できない、が業務ルール違反の実態なので 400 ではなく 422。
  invalid: HttpStatus.UNPROCESSABLE_ENTITY,
  conflict: HttpStatus.CONFLICT,
  unauthorized: HttpStatus.UNAUTHORIZED,
};

/**
 * すべての例外を契約 (ApiError) の形に統一して返すフィルタ。
 * - DomainError: kind に応じた 404/403/422/409/401 に翻訳する（ドメインは HTTP を知らないため）。
 * - HttpException: そのステータスを使う（Pipe が載せた errors はそのまま通す）。
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
      const payload: ApiError = {
        statusCode: status,
        message: exception.message,
        // ドメインが名乗った属性名を、UI がフィールドへ割り付けられる形に展開する。
        errors: exception.fields?.map((field) => ({ field, messages: [exception.message] })),
      };
      response.status(status).json(payload);
      return;
    }

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
