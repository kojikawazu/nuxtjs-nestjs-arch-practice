import { z } from 'zod';
import type { LoginRequest } from '@app/api-client';
import {
  BCRYPT_MAX_PASSWORD_BYTES,
  MAX_EMAIL_LENGTH,
  isWithinUtf8Bytes,
} from '../../../../shared/validation/zod-helpers';

/**
 * ログインの入力スキーマ（zod）。契約 `LoginRequest` とのズレを型検出する。
 * 登録と同じ **UTF-8 72 バイト**上限を課す。ここを開けておくと、登録済みパスワードの
 * 先頭 72 バイトに任意の文字列を足した値でも `bcrypt.compare` が成功してしまう。
 * メールの上限も登録と揃える（DB の `varchar(255)` と同値。片方だけ開けておかない）。
 */
export const loginSchema = z
  .object({
    email: z.string().email().max(MAX_EMAIL_LENGTH),
    password: z
      .string()
      .min(1)
      .refine((v) => isWithinUtf8Bytes(v, BCRYPT_MAX_PASSWORD_BYTES), {
        message: `password must be at most ${BCRYPT_MAX_PASSWORD_BYTES} bytes in UTF-8`,
      }),
  })
  .strict() satisfies z.ZodType<LoginRequest>;

export type LoginDto = z.infer<typeof loginSchema>;
