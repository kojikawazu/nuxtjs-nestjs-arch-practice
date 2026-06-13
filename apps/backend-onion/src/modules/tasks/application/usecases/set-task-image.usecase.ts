import { Inject, Injectable } from '@nestjs/common';
import type { Task as TaskContract } from '@app/api-client';
import { TASK_REPOSITORY, type TaskRepository } from '../../domain/repositories/task.repository';
import {
  IMAGE_STORAGE,
  type ImageFile,
  type ImageStorage,
} from '../../domain/services/image-storage';
import { TaskAccessService } from '../../domain/services/task-access.service';
import { toContractTask } from '../task.mapper';

/**
 * タスクに画像を添付（1 枚・差し替え）する。
 * 所有権を確認 → ストレージへ保存 → imageUrl 更新 → 保存確定後に旧ファイルを掃除。
 */
@Injectable()
export class SetTaskImageUseCase {
  constructor(
    private readonly access: TaskAccessService,
    @Inject(TASK_REPOSITORY)
    private readonly tasks: TaskRepository,
    @Inject(IMAGE_STORAGE)
    private readonly storage: ImageStorage,
  ) {}

  async execute(userId: string, id: string, file: ImageFile): Promise<TaskContract> {
    const task = await this.access.loadOwned(userId, id);
    const publicPath = await this.storage.save(task.id, file);
    const previous = task.attachImage(publicPath);
    const saved = await this.tasks.update(task);
    // 保存が確定してから旧ファイルを掃除する（失敗しても本処理は成功扱い）
    await this.storage.remove(previous);
    return toContractTask(saved);
  }
}
