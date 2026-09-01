import { Inject, Injectable } from '@nestjs/common';
import { IMAGE_STORAGE, type ImageStorage } from '../ports/image-storage.port';
import { TASK_REPOSITORY, type TaskRepository } from '../ports/task-repository.port';
import { TaskAccessService } from '../services/task-access.service';

/** 自分のタスクを削除する（存在しない=404 / 非所有=403。添付画像の実体も消す）。 */
@Injectable()
export class DeleteTaskUseCase {
  constructor(
    private readonly access: TaskAccessService,
    @Inject(TASK_REPOSITORY)
    private readonly tasks: TaskRepository,
    @Inject(IMAGE_STORAGE)
    private readonly storage: ImageStorage,
  ) {}

  /**
   * TaskAccessService で所有タスクをロード（不存在=404 / 非所有=403）→ DB から削除 → 添付画像の実体も削除する。
   *
   * 順序は「DB → ストレージ」。逆にすると DB 削除が失敗したとき「レコードはあるのに実体が無い」
   * リンク切れになる。この順なら最悪でも参照されない孤立ファイルが残るだけで、
   * imageUrl を持つ行が消えているため公開 URL からも辿れない（`remove` は無ければ無視する）。
   * @param userId - string（@CurrentUser 由来の所有者 ID）
   * @param id - string（対象タスクの ID）
   * @returns Promise<void>
   */
  async execute(userId: string, id: string): Promise<void> {
    const task = await this.access.loadOwned(userId, id);
    const imageUrl = task.imageUrl;
    await this.tasks.deleteById(task.id);
    await this.storage.remove(imageUrl);
  }
}
