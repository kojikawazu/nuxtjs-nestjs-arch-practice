import type { NewTask, Task } from '../../domain/entities/task';

/** DI トークン（interface は実行時に消えるため Symbol で provide/inject する）。 */
export const TASK_REPOSITORY = Symbol('TASK_REPOSITORY');

/**
 * タスク永続化の Port（依存性逆転の境界）。
 *
 * application 層はこの interface にのみ依存し、TypeORM を知らない。
 * 実装は infrastructure 層（TypeOrmTaskRepository）が提供し、DI で注入する。
 * これがレイヤード版（UseCase が TypeORM Repository を直接利用）との本質的な差。
 */
export interface TaskRepository {
  findById(id: string): Promise<Task | null>;
  listByUserId(userId: string): Promise<Task[]>;
  create(input: NewTask): Promise<Task>;
  update(task: Task): Promise<Task>;
  deleteById(id: string): Promise<void>;
}
