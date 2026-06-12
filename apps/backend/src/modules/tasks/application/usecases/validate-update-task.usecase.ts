import { Inject, Injectable } from '@nestjs/common';
import type { TaskUpdateInput } from '../../domain/task';
import { TaskNotFoundError } from '../../domain/task-errors';
import { TASK_REPOSITORY, type TaskRepositoryPort } from '../ports/task-repository.port';

/**
 * タスク更新の DryRun（検証のみ・保存しない）。
 * 所有権（存在=404 / 非所有=403）を確認し、更新後の開始≤終了も検証するが、状態は変えない。
 */
@Injectable()
export class ValidateUpdateTaskUseCase {
  constructor(
    @Inject(TASK_REPOSITORY)
    private readonly tasks: TaskRepositoryPort,
  ) {}

  async execute(userId: string, id: string, patch: TaskUpdateInput): Promise<void> {
    const task = await this.tasks.findById(id);
    if (!task) {
      throw new TaskNotFoundError();
    }
    task.assertOwnedBy(userId);
    task.assertUpdatable(patch);
  }
}
