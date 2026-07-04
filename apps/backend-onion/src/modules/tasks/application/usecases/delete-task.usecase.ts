import { Inject, Injectable } from '@nestjs/common';
import { TASK_REPOSITORY, type TaskRepository } from '../../domain/repositories/task.repository';
import { TaskAccessService } from '../../domain/services/task-access.service';

/** 自分のタスクを削除する（存在しない=404 / 非所有=403）。 */
@Injectable()
export class DeleteTaskUseCase {
  constructor(
    private readonly access: TaskAccessService,
    @Inject(TASK_REPOSITORY)
    private readonly tasks: TaskRepository,
  ) {}

  /**
   * TaskAccessService で所有タスクをロード（不存在=404 / 非所有=403）してから削除する。
   * @param userId: string（@CurrentUser 由来の所有者 ID）
   * @param id: string（対象タスクの ID）
   * @returns Promise<void>
   */
  async execute(userId: string, id: string): Promise<void> {
    const task = await this.access.loadOwned(userId, id);
    await this.tasks.deleteById(task.id);
  }
}
