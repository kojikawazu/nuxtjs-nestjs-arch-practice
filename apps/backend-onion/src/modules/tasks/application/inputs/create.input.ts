import type { TaskCreate, TaskStatus } from '@app/api-client';

/**
 * タスク作成のユースケース入力（application 層が所有する Command 型）。
 *
 * presentation の DTO（HTTP・zod スキーマの都合）と切り離し、application は
 * この Input にのみ依存する。日付は文字列ではなく `Date` に正規化済み
 * （ISO 文字列 → Date の変換は境界＝presentation で済ませ、内側に文字列を持ち込まない）。
 */
export interface CreateTaskInput {
  userId: string;
  title: string;
  description?: string;
  status?: TaskStatus;
  startDate: Date;
  endDate: Date | null;
  url?: string;
}

/**
 * 契約ボディ（`TaskCreate`）＋認証ユーザーから {@link CreateTaskInput} を組み立てる。
 *
 * 入力に取るのは **契約型**（presentation の zod スキーマ推論型ではない）ため、application は
 * presentation を import せずに済む（オニオンの依存は常に内向き）。Controller は
 * `ZodValidationPipe(createTaskSchema)` で検証・整形した `TaskCreate` をそのまま渡せる。
 */
export function toCreateTaskInput(userId: string, body: TaskCreate): CreateTaskInput {
  return {
    userId,
    title: body.title,
    description: body.description,
    status: body.status,
    startDate: new Date(body.startDate),
    endDate: body.endDate ? new Date(body.endDate) : null,
    url: body.url,
  };
}
