import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaskEntity } from '../../infrastructure/task.entity';
import { findOwnedTask, removeStoredFile } from '../task.util';

/** 自分のタスクを削除する（存在しない=404 / 非所有=403。添付画像の実体も消す）。 */
@Injectable()
export class DeleteTaskUseCase {
  constructor(
    @InjectRepository(TaskEntity)
    private readonly tasks: Repository<TaskEntity>,
    private readonly config: ConfigService,
  ) {}

  /**
   * findOwnedTask で所有 Entity をロード（不存在=404 / 非所有=403）→ DB から削除 → 添付画像の実体も削除する。
   *
   * 順序は「DB → ストレージ」。逆にすると DB 削除が失敗したとき「レコードはあるのに実体が無い」
   * リンク切れになる。この順なら最悪でも参照されない孤立ファイルが残るだけで、
   * imageUrl を持つ行が消えているため公開 URL からも辿れない（`remove` は無ければ無視する）。
   * @param userId - string（@CurrentUser 由来の所有者 ID）
   * @param id - string（対象タスクの ID）
   * @returns Promise<void>
   */
  async execute(userId: string, id: string): Promise<void> {
    const entity = await findOwnedTask(this.tasks, userId, id);
    const imageUrl = entity.imageUrl;
    await this.tasks.delete({ id: entity.id });
    const dir = this.config.getOrThrow<string>('upload.dir');
    await removeStoredFile(dir, imageUrl);
  }
}
