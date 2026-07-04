import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { Task } from '@app/api-client';
import { TaskEntity } from '../../infrastructure/task.entity';
import { toContractTask } from '../task.util';

/** 自分のタスク一覧を作成日時の降順で取得する（application 層のユースケース）。 */
@Injectable()
export class ListTasksUseCase {
  constructor(
    @InjectRepository(TaskEntity)
    private readonly tasks: Repository<TaskEntity>,
  ) {}

  /**
   * userId のタスクを作成日時の降順で取得し、契約 Task[] に変換して返す。
   * @param userId - string（@CurrentUser 由来の所有者 ID）
   * @returns Promise<Task[]>（契約 Task[]。源: @app/api-client ← packages/api-spec/main.tsp）
   */
  async execute(userId: string): Promise<Task[]> {
    const rows = await this.tasks.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
    return rows.map(toContractTask);
  }
}
