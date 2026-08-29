import type { NewTask, Task } from '../entities/task';

/** DI トークン（interface は実行時に消えるため Symbol で provide/inject する）。 */
export const TASK_REPOSITORY = Symbol('TASK_REPOSITORY');

/**
 * タスク永続化の契約（リポジトリインターフェース）。
 *
 * オニオンアーキテクチャでは **契約をドメイン中核が所有する**（この interface は domain 層に置く）。
 * application / infrastructure はこの契約に従う。実装は infrastructure 層が提供し DI で注入する。
 * → clean 版（Port を application 層に置く）との配置上の対比点。依存は常に内向き（→ domain）。
 */
export interface TaskRepository {
  findById(id: string): Promise<Task | null>;
  listByUserId(userId: string): Promise<Task[]>;
  create(input: NewTask): Promise<Task>;
  update(task: Task): Promise<Task>;
  deleteById(id: string): Promise<void>;
}
