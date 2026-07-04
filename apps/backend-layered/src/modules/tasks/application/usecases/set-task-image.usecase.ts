import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { Task } from '@app/api-client';
import { TaskEntity } from '../../infrastructure/task.entity';
import { findOwnedTask, removeStoredFile, saveImageFile, toContractTask } from '../task.util';

/**
 * タスクに画像を添付（1 枚・差し替え）する。
 * 所有権を確認 → サーバ生成名で保存 → imageUrl 更新 → 保存確定後に旧ファイルを掃除。
 */
@Injectable()
export class SetTaskImageUseCase {
  constructor(
    @InjectRepository(TaskEntity)
    private readonly tasks: Repository<TaskEntity>,
    private readonly config: ConfigService,
  ) {}

  /**
   * findOwnedTask で所有 Entity をロード → サーバ生成名で保存 → imageUrl 更新 → 保存確定後に旧ファイルを掃除。
   * @param userId - string（@CurrentUser 由来の所有者 ID）
   * @param id - string（対象タスクの ID）
   * @param file - Express.Multer.File（multipart の file フィールド）
   * @returns Promise<Task>（imageUrl 入りの契約 Task。源: @app/api-client ← packages/api-spec/main.tsp）
   */
  async execute(userId: string, id: string, file: Express.Multer.File): Promise<Task> {
    const entity = await findOwnedTask(this.tasks, userId, id);
    const dir = this.config.getOrThrow<string>('upload.dir');
    const previous = entity.imageUrl;

    entity.imageUrl = await saveImageFile(dir, entity.id, file);
    const saved = await this.tasks.save(entity);
    // 保存が確定してから旧ファイルを掃除する（失敗しても本処理は成功扱い）
    await removeStoredFile(dir, previous);
    return toContractTask(saved);
  }
}
