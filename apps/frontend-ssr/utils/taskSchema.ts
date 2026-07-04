import { z } from 'zod';
import type { Task } from '@app/api-client';

/**
 * backend レスポンスの `Task` をランタイム検証する zod スキーマ。
 *
 * 型（`@app/api-client` の `Task`）は契約由来だが、それは**コンパイル時**の保証にすぎない。
 * 実際のレスポンスが契約どおりか（想定外の欠落・型崩れがないか）を境界で検証するのがこのスキーマ。
 * `satisfies z.ZodType<Task>` で契約とのズレを型でも検出する。
 */
export const taskSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  status: z.enum(['todo', 'in_progress', 'done']),
  startDate: z.string(),
  endDate: z.string().optional(),
  url: z.string().optional(),
  imageUrl: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
}) satisfies z.ZodType<Task>;

export const taskListSchema = z.array(taskSchema);
