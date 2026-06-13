import { Injectable } from '@nestjs/common';
import type { Task as TaskContract } from '@app/api-client';
import { TaskAccessService } from '../../domain/services/task-access.service';
import { toContractTask } from '../task.mapper';

/** 自分のタスクを 1 件取得する（存在しない=404 / 非所有=403）。 */
@Injectable()
export class GetTaskUseCase {
  constructor(private readonly access: TaskAccessService) {}

  async execute(userId: string, id: string): Promise<TaskContract> {
    const task = await this.access.loadOwned(userId, id);
    return toContractTask(task);
  }
}
