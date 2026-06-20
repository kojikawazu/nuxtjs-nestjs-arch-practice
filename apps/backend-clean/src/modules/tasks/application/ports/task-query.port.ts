import type { Task as TaskContract } from '@app/api-client';

/** DI トークン（interface は実行時に消えるため Symbol で provide/inject する）。 */
export const TASK_QUERY = Symbol('TASK_QUERY');

/**
 * タスク参照（読み取り）専用の Port（CQRS の Query 側）。
 *
 * 書き込み側の {@link TaskRepository} と異なり、ドメイン Task を返さず **契約 Task を直接返す**。
 * 実装（infrastructure）は ORM 行 → 契約形へ 1 段で射影し、ドメインの不変条件・振る舞いを
 * 経由しない（参照には不要なため）。これが read/write 分離（CQRS-lite）の要。
 */
export interface TaskQuery {
  /** 自分のタスク一覧（作成日時の降順）。所有でフィルタ済みのため owner 判定は不要。 */
  listByUserId(userId: string): Promise<TaskContract[]>;

  /**
   * id で 1 件引く。存在しなければ null。
   * 404（不存在）と 403（非所有）を呼び出し側で区別できるよう、所有者 id を添えて返す
   * （`where {id, userId}` で短絡すると他人のタスクが 404 になり契約に反するため）。
   */
  findByIdWithOwner(id: string): Promise<{ task: TaskContract; ownerId: string } | null>;
}
