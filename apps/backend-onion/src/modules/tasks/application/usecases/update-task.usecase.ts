import { Inject, Injectable } from '@nestjs/common';
import type { Task as TaskContract } from '@app/api-client';
import { TASK_REPOSITORY, type TaskRepository } from '../../domain/repositories/task.repository';
import { TaskAccessService } from '../../domain/services/task-access.service';
import type { UpdateTaskDto } from '../../presentation/dto/update-task.dto';
import { toContractTask } from '../task.mapper';

/** 自分のタスクを部分更新する（指定フィールドのみ反映し、開始≤終了を再検証）。 */
@Injectable()
export class UpdateTaskUseCase {
  constructor(
    private readonly access: TaskAccessService,
    @Inject(TASK_REPOSITORY)
    private readonly tasks: TaskRepository,
  ) {}

  async execute(userId: string, id: string, dto: UpdateTaskDto): Promise<TaskContract> {
    const task = await this.access.loadOwned(userId, id);
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
