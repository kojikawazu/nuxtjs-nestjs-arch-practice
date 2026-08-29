import { UnprocessableEntityException, type PipeTransform } from '@nestjs/common';
import type { ZodError, ZodType } from 'zod';
import type { ValidationError } from '@app/api-client';

/** path を持たない issue（ボディ自体が object でない等）をまとめる擬似フィールド名。 */
const ROOT_FIELD = '_';

/**
 * zod スキーマでリクエストボディを検証する Pipe（presentation 境界）。
 *
 * - 形式は正しい JSON だがフィールド単位で意味的に不正、という状態なので
 *   `UnprocessableEntityException`（422）を投げる（400 は「構文が壊れている」の意）。
 *   `AllExceptionsFilter` が契約 `ApiError` 形へ翻訳する。
 * - スキーマは `.strict()` を前提とし、未知のキーは弾く（旧 `forbidNonWhitelisted` 相当）。
 * - `new ZodValidationPipe(schema)` としてルート単位で使う（`@Body(new ZodValidationPipe(...))`）。
 */
export class ZodValidationPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: ZodType<T>) {}

  transform(value: unknown): T {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      // message（人間向けの一文）と errors（UI がフィールドへ割り付ける構造）を併存させる。
      // message を構造化した値へ差し替えると、契約 ApiError.message に依存する箇所が壊れるため。
      throw new UnprocessableEntityException({
        message: formatZodError(result.error),
        errors: toValidationErrors(result.error),
      });
    }
    return result.data;
  }
}

/** ZodError を `field: message` の連結文字列にする（ApiError.message 用の人間向けの一文）。 */
function formatZodError(error: ZodError): string {
  return error.issues
    .map((issue) => {
      const path = issue.path.join('.');
      return path ? `${path}: ${issue.message}` : issue.message;
    })
    .join(', ');
}

/**
 * ZodError を契約 `ApiError.errors` の形へ変換する。
 * ネストした path は `a.b` に潰し、path を持たない issue は `_` にまとめる（捨てると理由が失われるため）。
 * 同一フィールドの複数 issue は 1 要素の messages にまとめ、フィールドの出現順は保つ。
 */
function toValidationErrors(error: ZodError): ValidationError[] {
  const byField = new Map<string, string[]>();
  const add = (field: string, message: string): void => {
    const messages = byField.get(field);
    if (messages) {
      messages.push(message);
    } else {
      byField.set(field, [message]);
    }
  };

  for (const issue of error.issues) {
    // `.strict()` の未知キー違反は「オブジェクト全体の 1 件」として path 空で来るため、
    // そのままでは `_` に落ちて「どのキーが余計か」が構造から失われる。keys から復元する。
    if (issue.code === 'unrecognized_keys') {
      for (const key of issue.keys) {
        add(key, issue.message);
      }
      continue;
    }
    add(issue.path.length > 0 ? issue.path.join('.') : ROOT_FIELD, issue.message);
  }
  return [...byField].map(([field, messages]) => ({ field, messages }));
}
