import { z } from 'zod';
import type { TaskUpdate } from '@app/api-client';
import { createTaskSchema } from './create.dto';

/**
 * すべてのフィールドを任意にした更新用スキーマ（バリデーションルールは `createTaskSchema` を継承）。
 * `.strict()` は `.partial()` にも引き継がれるため、未知キーは引き続き弾く。
 *
 * 任意項目だけ `nullable` にして、**「キーが無い＝変更しない」と「`null`＝削除する」を区別する**。
 * `undefined` 一本だと利用者が説明・期限・URL を消せない（消したつもりでも保存後に元の値が戻る）。
 * 値そのものの検証ルール（長さ・日付形式・URL スキーム）は `createTaskSchema` の定義を
 * そのまま流用するため、同じルールが 2 か所に散らない。
 * `title` / `status` / `startDate` は必須項目なので nullable にしない（消す対象ではない）。
 */
export const updateTaskSchema = createTaskSchema
  .partial()
  .extend({
    description: createTaskSchema.shape.description.nullable(),
    endDate: createTaskSchema.shape.endDate.nullable(),
    url: createTaskSchema.shape.url.nullable(),
  })
  .strict() satisfies z.ZodType<TaskUpdate>;

export type UpdateTaskDto = z.infer<typeof updateTaskSchema>;
