import { Inject, Injectable } from '@nestjs/common';
import type { Task } from '../../domain/task';
import { TaskNotFoundError } from '../../domain/task-errors';
import {
  IMAGE_STORAGE,
  type ImageStoragePort,
  type UploadedImage,
} from '../ports/image-storage.port';
import { TASK_REPOSITORY, type TaskRepositoryPort } from '../ports/task-repository.port';

/**
 * タスクに画像を添付（1 枚・差し替え）する。
 * 所有権を確認 → ストレージへ保存 → ドメイン更新 → 永続化 → 旧ファイルを掃除、の順。
 * 保存・永続化が確定してから旧ファイルを消す（掃除の失敗で本処理を巻き戻さない）。
 */
@Injectable()
export class SetTaskImageUseCase {
  constructor(
    @Inject(TASK_REPOSITORY)
    private readonly tasks: TaskRepositoryPort,
    @Inject(IMAGE_STORAGE)
    private readonly images: ImageStoragePort,
  ) {}

  async execute(userId: string, id: string, file: UploadedImage): Promise<Task> {
    const task = await this.tasks.findById(id);
    if (!task) {
      throw new TaskNotFoundError();
    }
    task.assertOwnedBy(userId);

    const previous = task.imageUrl;
    const publicPath = await this.images.save(task.id, file);
    task.attachImage(publicPath);
    const saved = await this.tasks.update(task);
    await this.images.remove(previous);
    return saved;
  }
}
