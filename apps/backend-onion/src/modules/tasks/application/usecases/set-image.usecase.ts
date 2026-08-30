import { Inject, Injectable } from '@nestjs/common';
import type { Task as TaskContract } from '@app/api-client';
import { TASK_REPOSITORY, type TaskRepository } from '../../domain/repositories/task.repository';
import {
  IMAGE_STORAGE,
  type ImageFile,
  type ImageStorage,
} from '../../domain/services/image-storage';
import { TaskAccessService } from '../../domain/services/task-access.service';
import { toContractTask } from '../mappers/task.mapper';

/**
 * タスクに画像を添付（1 枚・差し替え）する。
 * 所有権を確認 → ストレージへ保存 → imageUrl 更新 → 保存確定後に旧ファイルを掃除。
 * 保存に失敗した場合は、直前に書いた新ファイルを消してから元のエラーを投げ直す。
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

  /**
   * 所有タスクをロード → ストレージへ保存 → imageUrl 更新 → 保存確定後に旧ファイルを掃除。
   * 保存に失敗したら新ファイルを補償削除し、元のエラーを投げ直す（孤立ファイルを残さない）。
   * @param userId - string（@CurrentUser 由来の所有者 ID）
   * @param id - string（対象タスクの ID）
   * @param file - ImageFile（mimetype/buffer のみ。Controller が Multer file から詰め替え）
   * @returns Promise<Task>（imageUrl 入りの契約 Task。源: @app/api-client ← packages/api-spec/main.tsp）
   */
  async execute(userId: string, id: string, file: ImageFile): Promise<TaskContract> {
    const task = await this.access.loadOwned(userId, id);
    const publicPath = await this.storage.save(task.id, file);
    const previous = task.attachImage(publicPath);
    const saved = await this.tasks.update(task).catch(async (error: unknown) => {
      // 保存に失敗したら、直前に書いた新ファイルを消す。ここを補償しないと
      // どこからも参照されないファイルがストレージに残り続ける（削除と違い、
      // 添付は imageUrl を決めるためにファイル生成が先に要るので順序を逆にできない）。
      // 補償削除が失敗しても握りつぶし、**元のエラーを投げ直す**
      // （原因が「保存に失敗した」から「掃除に失敗した」へすり替わると調査が迷子になる）。
      await this.storage.remove(publicPath).catch(() => undefined);
      throw error;
    });
    // 保存が確定してから旧ファイルを掃除する（失敗しても本処理は成功扱い）
    await this.storage.remove(previous);
    return toContractTask(saved);
  }
}
