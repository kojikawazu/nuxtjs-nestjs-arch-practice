import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { Task } from '@app/api-client';
import { TaskEntity } from '../../infrastructure/task.entity';
import { findOwnedTask, toContractTask } from '../task.util';

/** 自分のタスクを 1 件取得する（存在しない=404 / 非所有=403）。 */
@Injectable()
export class GetTaskUseCase {
  constructor(
    @InjectRepository(TaskEntity)
    private readonly tasks: Repository<TaskEntity>,
  ) {}

  /**
   * findOwnedTask で所有 Entity をロード（不存在=404 / 非所有=403）→ 契約 Task に変換して返す。
   * @param userId: string（@CurrentUser 由来の所有者 ID）
   * @param id: string（対象タスクの ID）
   * @returns Promise<Task>（契約 Task。源: @app/api-client ← packages/api-spec/main.tsp）
   */
  async execute(userId: string, id: string): Promise<Task> {
    const entity = await findOwnedTask(this.tasks, userId, id);
    return toContractTask(entity);
  }
}
