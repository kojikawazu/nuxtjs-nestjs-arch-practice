import type { TaskStatus, TaskUpdate } from '@app/api-client';

/**
 * タスク部分更新のユースケース入力（application 層が所有する Command 型）。
 *
 * 「指定されたフィールドのみ反映」を表すため、各属性は `undefined`（未指定）を保持する。
 * 日付は `Date` に正規化済み（境界で変換）。`userId`/`id` は認可・対象特定に使う。
 */
export interface UpdateTaskInput {
  userId: string;
  id: string;
  title?: string;
  description?: string;
  status?: TaskStatus;
  startDate?: Date;
  endDate?: Date | null;
  url?: string;
}

/**
 * 契約ボディ（`TaskUpdate`）＋認証ユーザー＋対象 id から {@link UpdateTaskInput} を組み立てる。
 *
 * 未指定（`undefined`）はそのまま未指定として保持し、指定された日付のみ `Date` に変換する。
 * 入力に契約型を取ることで application は presentation に依存しない。
 */
export function toUpdateTaskInput(userId: string, id: string, body: TaskUpdate): UpdateTaskInput {
  return {
    userId,
    id,
    title: body.title,
    description: body.description,
    status: body.status,
    startDate: body.startDate !== undefined ? new Date(body.startDate) : undefined,
    endDate:
      body.endDate !== undefined ? (body.endDate ? new Date(body.endDate) : null) : undefined,
    url: body.url,
  };
}
