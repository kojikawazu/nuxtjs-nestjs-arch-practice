import { Inject, Injectable } from '@nestjs/common';
import type { Task } from '../../domain/task';
import { TaskNotFoundError } from '../../domain/task-errors';
import { TASK_REPOSITORY, type TaskRepositoryPort } from '../ports/task-repository.port';

/** 自分のタスクを 1 件取得する（存在=404 / 非所有=403 はドメインエラーで表現）。 */
@Injectable()
export class GetTaskUseCase {
  constructor(
    @Inject(TASK_REPOSITORY)
    private readonly tasks: TaskRepositoryPort,
  ) {}

  async execute(userId: string, id: string): Promise<Task> {
    const task = await this.tasks.findById(id);
    if (!task) {
      throw new TaskNotFoundError();
    }
    task.assertOwnedBy(userId);
    return task;
  }
}
