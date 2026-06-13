import { Inject, Injectable } from '@nestjs/common';
import type { Task as TaskContract } from '@app/api-client';
import { Task } from '../../domain/task';
import type { CreateTaskDto } from '../../presentation/dto/create-task.dto';
import { TASK_REPOSITORY, type TaskRepository } from '../ports/task-repository.port';
import { toContractTask } from '../task.mapper';

/** タスクを新規作成する（application 層のユースケース。Port にのみ依存）。 */
@Injectable()
export class CreateTaskUseCase {
  constructor(
    @Inject(TASK_REPOSITORY)
    private readonly tasks: TaskRepository,
  ) {}

  async execute(userId: string, dto: CreateTaskDto): Promise<TaskContract> {
    const draft = Task.draft({
      userId,
      title: dto.title,
      description: dto.description,
      status: dto.status,
      startDate: new Date(dto.startDate),
      endDate: dto.endDate ? new Date(dto.endDate) : null,
      url: dto.url,
    });
    const created = await this.tasks.create(draft);
    return toContractTask(created);
  }
}
