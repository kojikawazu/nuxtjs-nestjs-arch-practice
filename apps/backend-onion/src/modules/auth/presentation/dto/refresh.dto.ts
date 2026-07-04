import { z } from 'zod';
import type { RefreshRequest } from '@app/api-client';

/** リフレッシュの入力スキーマ（zod）。契約 `RefreshRequest` とのズレを型検出する。 */
export const refreshSchema = z
  .object({
    refreshToken: z.string().min(1),
  })
  .strict() satisfies z.ZodType<RefreshRequest>;

export type RefreshDto = z.infer<typeof refreshSchema>;
