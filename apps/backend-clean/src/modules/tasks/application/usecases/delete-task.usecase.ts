import { Inject, Injectable } from '@nestjs/common';
import { loadOwnedTask } from '../task-access';
import { TASK_REPOSITORY, type TaskRepository } from '../ports/task-repository.port';

/** 自分のタスクを削除する（存在しない=404 / 非所有=403）。 */
@Injectable()
export class DeleteTaskUseCase {
  constructor(
    @Inject(TASK_REPOSITORY)
    private readonly tasks: TaskRepository,
  ) {}

  async execute(userId: string, id: string): Promise<void> {
    const task = await loadOwnedTask(this.tasks, userId, id);
    await this.tasks.deleteById(task.id);
  }
}
