import { Inject, Injectable } from '@nestjs/common';
import type { Task } from '../../domain/task';
import { TaskNotFoundError } from '../../domain/task-errors';
import { IMAGE_STORAGE, type ImageStoragePort } from '../ports/image-storage.port';
import { TASK_REPOSITORY, type TaskRepositoryPort } from '../ports/task-repository.port';

/** タスクの添付画像を削除する（実ファイルも削除。無ければ無視）。 */
@Injectable()
export class RemoveTaskImageUseCase {
  constructor(
    @Inject(TASK_REPOSITORY)
    private readonly tasks: TaskRepositoryPort,
    @Inject(IMAGE_STORAGE)
    private readonly images: ImageStoragePort,
  ) {}

  async execute(userId: string, id: string): Promise<Task> {
    const task = await this.tasks.findById(id);
    if (!task) {
      throw new TaskNotFoundError();
    }
    task.assertOwnedBy(userId);

    const previous = task.imageUrl;
    task.detachImage();
    const saved = await this.tasks.update(task);
    await this.images.remove(previous);
    return saved;
  }
}
