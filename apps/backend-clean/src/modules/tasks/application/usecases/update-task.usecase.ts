import { Inject, Injectable } from '@nestjs/common';
import type { Task as TaskContract } from '@app/api-client';
import type { UpdateTaskDto } from '../../presentation/dto/update-task.dto';
import { loadOwnedTask } from '../task-access';
import { TASK_REPOSITORY, type TaskRepository } from '../ports/task-repository.port';
import { toContractTask } from '../task.mapper';

/** 自分のタスクを部分更新する（指定フィールドのみ反映し、開始≤終了を再検証）。 */
@Injectable()
export class UpdateTaskUseCase {
  constructor(
    @Inject(TASK_REPOSITORY)
    private readonly tasks: TaskRepository,
  ) {}

  async execute(userId: string, id: string, dto: UpdateTaskDto): Promise<TaskContract> {
    const task = await loadOwnedTask(this.tasks, userId, id);
    task.applyUpdate({
      title: dto.title,
      description: dto.description,
      status: dto.status,
      startDate: dto.startDate !== undefined ? new Date(dto.startDate) : undefined,
      endDate: dto.endDate !== undefined ? (dto.endDate ? new Date(dto.endDate) : null) : undefined,
      url: dto.url,
    });
    const saved = await this.tasks.update(task);
    return toContractTask(saved);
  }
}
