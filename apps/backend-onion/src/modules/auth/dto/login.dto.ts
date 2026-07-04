import { z } from 'zod';
import type { LoginRequest } from '@app/api-client';

/** ログインの入力スキーマ（zod）。契約 `LoginRequest` とのズレを型検出する。 */
export const loginSchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(1),
  })
  .strict() satisfies z.ZodType<LoginRequest>;

export type LoginDto = z.infer<typeof loginSchema>;
