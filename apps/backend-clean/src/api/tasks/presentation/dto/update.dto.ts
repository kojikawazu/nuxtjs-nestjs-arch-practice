import { z } from 'zod';
import type { TaskUpdate } from '@app/api-client';
import { createTaskSchema } from './create.dto';

/**
 * すべてのフィールドを任意にした更新用スキーマ（バリデーションルールは `createTaskSchema` を継承）。
 * `.strict()` は `.partial()` にも引き継がれるため、未知キーは引き続き弾く。
 */
export const updateTaskSchema = createTaskSchema.partial() satisfies z.ZodType<TaskUpdate>;

export type UpdateTaskDto = z.infer<typeof updateTaskSchema>;
