import { z } from 'zod';
import type { RegisterRequest } from '@app/api-client';

/**
 * 登録の入力スキーマ（zod）。`satisfies z.ZodType<RegisterRequest>` で契約とのズレを型検出する。
 * パスワードは bcrypt の 72 バイト制約に整合させ 8〜72 文字に制限する。
 */
export const registerSchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(8).max(72),
    displayName: z.string().min(1).max(80),
  })
  .strict() satisfies z.ZodType<RegisterRequest>;

export type RegisterDto = z.infer<typeof registerSchema>;
