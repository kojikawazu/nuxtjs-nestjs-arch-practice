import { z } from 'zod';
import type { TaskCreate, TaskStatus } from '@app/api-client';
import { isHttpUrl, isRfc3339 } from '../../../../shared/validation/zod-helpers';

export const TASK_STATUSES: readonly TaskStatus[] = ['todo', 'in_progress', 'done'];

/** 日付が弾かれたときの理由。受理形式を利用者にそのまま伝える。 */
const DATE_MESSAGE = 'must be an RFC 3339 date (YYYY-MM-DD) or date-time with an offset';

/**
 * タスク作成の入力スキーマ（zod）。
 *
 * backend-clean は class-validator DTO の代わりに zod を採用する。`.strict()` で未知キーを弾き、
 * `satisfies z.ZodType<TaskCreate>` で契約（`TaskCreate`）とのズレをコンパイル時に検出する
 * （旧 `implements TaskCreate` と同じ狙い。契約が変われば型エラーで気づける）。
 * 開始 ≤ 終了の業務ルールは domain 側で担保するため、ここでは形式・存在・スキームのみ検証する。
 */
export const createTaskSchema = z
  .object({
    title: z.string().min(1).max(120),
    description: z.string().max(2000).optional(),
    status: z.enum(['todo', 'in_progress', 'done']).optional(),
    // 受理形式は RFC 3339 の full-date か、オフセット必須の date-time だけ。
    // オフセットを任意にすると、同じ入力がホストの TZ 次第で別の instant として保存される。
    startDate: z.string().refine(isRfc3339, { message: DATE_MESSAGE }),
    endDate: z.string().refine(isRfc3339, { message: DATE_MESSAGE }).optional(),
    // 関連 URL（任意）。http/https のみ許可し、javascript: 等の危険スキームは 422 で拒否する。
    url: z
      .string()
      .max(2048)
      .refine(isHttpUrl, { message: 'url must be http or https' })
      .optional(),
  })
  .strict() satisfies z.ZodType<TaskCreate>;

export type CreateTaskDto = z.infer<typeof createTaskSchema>;
