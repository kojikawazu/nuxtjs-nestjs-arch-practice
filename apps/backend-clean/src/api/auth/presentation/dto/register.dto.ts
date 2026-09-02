import { z } from 'zod';
import type { RegisterRequest } from '@app/api-client';
import {
  BCRYPT_MAX_PASSWORD_BYTES,
  MAX_EMAIL_LENGTH,
  isWithinUtf8Bytes,
} from '../../../../shared/validation/zod-helpers';

/**
 * 登録の入力スキーマ（zod）。`satisfies z.ZodType<RegisterRequest>` で契約とのズレを型検出する。
 * パスワードの上限は **UTF-8 72 バイト**（bcrypt が切り捨てる境界）で、文字数ではない。
 * `.max(72)` だとマルチバイトで 72 バイト超が通り、先頭 72 バイトが同じ別パスワードでもログインできてしまう。
 * メールの上限は DB カラム（`varchar(255)`）と同値で、超過を INSERT 前に弾く（超過は 422）。
 */
export const registerSchema = z
  .object({
    email: z.string().email().max(MAX_EMAIL_LENGTH),
    password: z
      .string()
      .min(8)
      .refine((v) => isWithinUtf8Bytes(v, BCRYPT_MAX_PASSWORD_BYTES), {
        message: `password must be at most ${BCRYPT_MAX_PASSWORD_BYTES} bytes in UTF-8`,
      }),
    displayName: z.string().min(1).max(80),
  })
  .strict() satisfies z.ZodType<RegisterRequest>;

export type RegisterDto = z.infer<typeof registerSchema>;
