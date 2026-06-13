import type { Task } from '../domain/task';
import { TaskNotFoundError } from '../domain/task.errors';
import type { TaskRepository } from './ports/task-repository.port';

/**
 * 所有タスクを 1 件ロードする共有ヘルパー（application 層）。
 * 存在しなければ TaskNotFoundError、非所有なら（domain の）TaskAccessDeniedError。
 */
export async function loadOwnedTask(
  repo: TaskRepository,
  userId: string,
  id: string,
): Promise<Task> {
  const task = await repo.findById(id);
  if (!task) {
    throw new TaskNotFoundError();
  }
  task.assertOwnedBy(userId);
  return task;
}
