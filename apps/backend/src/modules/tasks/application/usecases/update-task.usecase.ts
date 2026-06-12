import { Inject, Injectable } from '@nestjs/common';
import type { Task, TaskUpdateInput } from '../../domain/task';
import { TaskNotFoundError } from '../../domain/task-errors';
import { TASK_REPOSITORY, type TaskRepositoryPort } from '../ports/task-repository.port';

/** 自分のタスクを部分更新する（認可・不変条件はドメインが担保）。 */
@Injectable()
export class UpdateTaskUseCase {
  constructor(
    @Inject(TASK_REPOSITORY)
    private readonly tasks: TaskRepositoryPort,
  ) {}

  async execute(userId: string, id: string, patch: TaskUpdateInput): Promise<Task> {
    const task = await this.tasks.findById(id);
    if (!task) {
      throw new TaskNotFoundError();
    }
    task.assertOwnedBy(userId);
    task.applyUpdate(patch);
    return this.tasks.update(task);
  }
}
