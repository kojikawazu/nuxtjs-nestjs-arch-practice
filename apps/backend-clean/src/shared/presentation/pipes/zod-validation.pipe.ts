import { BadRequestException, type PipeTransform } from '@nestjs/common';
import type { ZodError, ZodType } from 'zod';

/**
 * zod スキーマでリクエストボディを検証する Pipe（presentation 境界）。
 *
 * - 入力の形式検証は transport（HTTP）の関心事なので、失敗時は
 *   `BadRequestException`（400）を投げる。`AllExceptionsFilter` が契約 `ApiError` 形へ翻訳する。
 * - スキーマは `.strict()` を前提とし、未知のキーは弾く（旧 `forbidNonWhitelisted` 相当）。
 * - `new ZodValidationPipe(schema)` としてルート単位で使う（`@Body(new ZodValidationPipe(...))`）。
 */
export class ZodValidationPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: ZodType<T>) {}

  transform(value: unknown): T {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException(formatZodError(result.error));
    }
    return result.data;
  }
}

/** ZodError を `field: message` の連結文字列にする（class-validator の 400 メッセージ形に寄せる）。 */
function formatZodError(error: ZodError): string {
  return error.issues
    .map((issue) => {
      const path = issue.path.join('.');
      return path ? `${path}: ${issue.message}` : issue.message;
    })
    .join(', ');
}
