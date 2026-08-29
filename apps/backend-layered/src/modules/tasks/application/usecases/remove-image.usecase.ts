import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { Task } from '@app/api-client';
import { TaskEntity } from '../../infrastructure/task.entity';
import { findOwnedTask, removeStoredFile, toContractTask } from '../task.util';

/** タスクの添付画像を削除する（実ファイルも削除。無ければ無視）。 */
@Injectable()
export class RemoveTaskImageUseCase {
  constructor(
    @InjectRepository(TaskEntity)
    private readonly tasks: Repository<TaskEntity>,
    private readonly config: ConfigService,
  ) {}

  /**
   * findOwnedTask で所有 Entity をロード → imageUrl を外して保存 → 実ファイルを削除（無ければ無視）。
   * @param userId - string（@CurrentUser 由来の所有者 ID）
   * @param id - string（対象タスクの ID）
   * @returns Promise<Task>（imageUrl の消えた契約 Task。源: @app/api-client ← packages/api-spec/main.tsp）
   */
  async execute(userId: string, id: string): Promise<Task> {
    const entity = await findOwnedTask(this.tasks, userId, id);
    const previous = entity.imageUrl;
    entity.imageUrl = null;
    const saved = await this.tasks.save(entity);
    const dir = this.config.getOrThrow<string>('upload.dir');
    await removeStoredFile(dir, previous);
    return toContractTask(saved);
  }
}
