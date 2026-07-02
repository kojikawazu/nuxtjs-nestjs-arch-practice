import { z } from 'zod';
import type { TaskCreate, TaskStatus } from '@app/api-client';
import { isHttpUrl, isIso8601 } from '../../../../common/validation/zod-helpers';

export const TASK_STATUSES: readonly TaskStatus[] = ['todo', 'in_progress', 'done'];

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
    startDate: z.string().refine(isIso8601, { message: 'must be an ISO 8601 date' }),
    endDate: z.string().refine(isIso8601, { message: 'must be an ISO 8601 date' }).optional(),
    // 関連 URL（任意）。http/https のみ許可し、javascript: 等の危険スキームは 400 で拒否する。
    url: z
      .string()
      .max(2048)
      .refine(isHttpUrl, { message: 'url must be http or https' })
      .optional(),
  })
  .strict() satisfies z.ZodType<TaskCreate>;

export type CreateTaskDto = z.infer<typeof createTaskSchema>;
