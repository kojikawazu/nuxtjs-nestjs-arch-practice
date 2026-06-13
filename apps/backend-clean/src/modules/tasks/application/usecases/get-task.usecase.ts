import { Inject, Injectable } from '@nestjs/common';
import type { Task as TaskContract } from '@app/api-client';
import { loadOwnedTask } from '../task-access';
import { TASK_REPOSITORY, type TaskRepository } from '../ports/task-repository.port';
import { toContractTask } from '../task.mapper';

/** 自分のタスクを 1 件取得する（存在しない=404 / 非所有=403）。 */
@Injectable()
export class GetTaskUseCase {
  constructor(
    @Inject(TASK_REPOSITORY)
    private readonly tasks: TaskRepository,
  ) {}

  async execute(userId: string, id: string): Promise<TaskContract> {
    const task = await loadOwnedTask(this.tasks, userId, id);
    return toContractTask(task);
  }
}
