import { Inject, Injectable } from '@nestjs/common';
import { TaskNotFoundError } from '../../domain/task-errors';
import { TASK_REPOSITORY, type TaskRepositoryPort } from '../ports/task-repository.port';

/** 自分のタスクを削除する（存在=404 / 非所有=403）。 */
@Injectable()
export class DeleteTaskUseCase {
  constructor(
    @Inject(TASK_REPOSITORY)
    private readonly tasks: TaskRepositoryPort,
  ) {}

  async execute(userId: string, id: string): Promise<void> {
    const task = await this.tasks.findById(id);
    if (!task) {
      throw new TaskNotFoundError();
    }
    task.assertOwnedBy(userId);
    await this.tasks.deleteById(task.id);
  }
}
