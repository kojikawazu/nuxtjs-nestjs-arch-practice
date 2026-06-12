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

  async execute(userId: string): Promise<Task[]> {
    const rows = await this.tasks.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
    return rows.map(toContractTask);
  }
}
