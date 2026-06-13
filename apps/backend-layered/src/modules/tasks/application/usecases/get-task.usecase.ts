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

  async execute(userId: string, id: string): Promise<Task> {
    const entity = await findOwnedTask(this.tasks, userId, id);
    return toContractTask(entity);
  }
}
