import { Inject, Injectable } from '@nestjs/common';
import type { Task as TaskContract } from '@app/api-client';
import { loadOwnedTask } from '../task-access';
import { IMAGE_STORAGE, type ImageStorage } from '../ports/image-storage.port';
import { TASK_REPOSITORY, type TaskRepository } from '../ports/task-repository.port';
import { toContractTask } from '../task.mapper';

/** タスクの添付画像を削除する（実ファイルも削除。無ければ無視）。 */
@Injectable()
export class RemoveTaskImageUseCase {
  constructor(
    @Inject(TASK_REPOSITORY)
    private readonly tasks: TaskRepository,
    @Inject(IMAGE_STORAGE)
    private readonly storage: ImageStorage,
  ) {}

  /**
   * 所有タスクをロード → imageUrl を外して保存 → 実ファイルを削除（無ければ無視）。
   * @param userId - string（@CurrentUser 由来の所有者 ID）
   * @param id - string（対象タスクの ID）
   * @returns Promise<Task>（imageUrl の消えた契約 Task。源: @app/api-client ← packages/api-spec/main.tsp）
   */
  async execute(userId: string, id: string): Promise<TaskContract> {
    const task = await loadOwnedTask(this.tasks, userId, id);
    const previous = task.detachImage();
    const saved = await this.tasks.update(task);
    await this.storage.remove(previous);
    return toContractTask(saved);
  }
}
