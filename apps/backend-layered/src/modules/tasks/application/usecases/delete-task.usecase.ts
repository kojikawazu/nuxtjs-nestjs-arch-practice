import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaskEntity } from '../../infrastructure/task.entity';
import { findOwnedTask } from '../task.util';

/** 自分のタスクを削除する（存在しない=404 / 非所有=403）。 */
@Injectable()
export class DeleteTaskUseCase {
  constructor(
    @InjectRepository(TaskEntity)
    private readonly tasks: Repository<TaskEntity>,
  ) {}

  /**
   * findOwnedTask で所有 Entity をロード（不存在=404 / 非所有=403）してから削除する。
   * @param userId: string（@CurrentUser 由来の所有者 ID）
   * @param id: string（対象タスクの ID）
   * @returns Promise<void>
   */
  async execute(userId: string, id: string): Promise<void> {
    const entity = await findOwnedTask(this.tasks, userId, id);
    await this.tasks.delete({ id: entity.id });
  }
}
