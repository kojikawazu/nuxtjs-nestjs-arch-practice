import { type ArgumentsHost, Catch, type ExceptionFilter, HttpStatus } from '@nestjs/common';
import type { Response } from 'express';
import type { ApiError } from '@app/api-client';
import {
  DomainError,
  InvalidDateRangeError,
  TaskAccessDeniedError,
  TaskNotFoundError,
  UnsupportedImageTypeError,
} from '../domain/task-errors';

/** ドメインエラー種別 → HTTP ステータス + error ラベルの対応表。 */
function resolve(error: DomainError): { status: HttpStatus; label: string } {
  if (error instanceof TaskNotFoundError) {
    return { status: HttpStatus.NOT_FOUND, label: 'Not Found' };
  }
  if (error instanceof TaskAccessDeniedError) {
    return { status: HttpStatus.FORBIDDEN, label: 'Forbidden' };
  }
  if (error instanceof InvalidDateRangeError || error instanceof UnsupportedImageTypeError) {
    return { status: HttpStatus.BAD_REQUEST, label: 'Bad Request' };
  }
  return { status: HttpStatus.INTERNAL_SERVER_ERROR, label: 'Internal Server Error' };
}

/**
 * ドメインエラー → 契約 (ApiError) への翻訳フィルタ（presentation 層）。
 *
 * domain 層は HTTP を知らずにエラーを投げ、その HTTP 化をここで一手に引き受ける。
 * AllExceptionsFilter と同形の { statusCode, message, error } を返し、応答の一貫性を保つ。
 * コントローラスコープで適用するため、tasks 以外には影響しない。
 */
@Catch(DomainError)
export class DomainExceptionFilter implements ExceptionFilter {
  catch(exception: DomainError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const { status, label } = resolve(exception);
    const payload: ApiError = { statusCode: status, message: exception.message, error: label };
    response.status(status).json(payload);
  }
}
