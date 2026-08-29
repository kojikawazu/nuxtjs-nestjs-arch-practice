import { z } from 'zod';
import type { RegisterRequest } from '@app/api-client';
import {
  BCRYPT_MAX_PASSWORD_BYTES,
  isWithinUtf8Bytes,
} from '../../../../shared/validation/zod-helpers';

/**
 * 登録の入力スキーマ（zod）。`satisfies z.ZodType<RegisterRequest>` で契約とのズレを型検出する。
 * パスワードの上限は **UTF-8 72 バイト**（bcrypt が切り捨てる境界）で、文字数ではない。
 * `.max(72)` だとマルチバイトで 72 バイト超が通り、先頭 72 バイトが同じ別パスワードでもログインできてしまう。
 */
export const registerSchema = z
  .object({
    email: z.string().email(),
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
