import type { Task, TaskDraft } from '../../domain/task';

/**
 * タスク永続化のポート（application 層が定義する境界インターフェース）。
 *
 * application/domain は「保存できること」だけに依存し、TypeORM などの実装詳細は知らない
 * （依存性逆転）。具体実装は infrastructure/repositories が提供し、DI で差し込む。
 * 入出力は ORM Entity ではなくドメイン（Task / TaskDraft）で統一する。
 */
export interface TaskRepositoryPort {
  /** 指定ユーザーのタスクを作成日時の降順で返す。 */
  findManyByUser(userId: string): Promise<Task[]>;

  /** id で 1 件取得。存在しなければ null。 */
  findById(id: string): Promise<Task | null>;

  /** 新規タスクを永続化し、採番済み（id・日時付き）のドメインを返す。 */
  create(draft: TaskDraft): Promise<Task>;

  /** 既存タスクの変更を永続化し、最新のドメインを返す。 */
  update(task: Task): Promise<Task>;

  /** id でタスクを削除する。 */
  deleteById(id: string): Promise<void>;
}

/** DI トークン（interface は実行時に存在しないため Symbol で束ねる）。 */
export const TASK_REPOSITORY = Symbol('TASK_REPOSITORY');
