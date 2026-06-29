import type { Task as TaskContract } from '@app/api-client';

/**
 * 読み取り（CQRS の Query 側）の表現＝Read Model。
 *
 * CQRS-lite では API 契約 `Task` と同形だが、**読み取り表現を application が所有する**ことを
 * 型として明示し、書き込み側の domain `Task`（不変条件・振る舞いを持つ）と区別する。
 * Query 側は ORM 行 → この Read Model へ 1 段で直射影し、domain を経由しない。
 */
export type TaskReadModel = TaskContract;

/**
 * 404（不存在）と 403（非所有）を呼び出し側で区別するため、Read Model に所有者 id を添えた形。
 * （`where {id, userId}` で短絡すると他人のタスクが 404 になり契約に反するため、id だけで引く）
 */
export interface TaskReadModelWithOwner {
  task: TaskReadModel;
  ownerId: string;
}
