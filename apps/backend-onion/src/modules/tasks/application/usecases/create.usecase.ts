import { Inject, Injectable } from '@nestjs/common';
import type { Task as TaskContract } from '@app/api-client';
import { Task } from '../../domain/entities/task';
import { TASK_REPOSITORY, type TaskRepository } from '../../domain/repositories/task.repository';
import type { CreateTaskDto } from '../../presentation/dto/create.dto';
import { toContractTask } from '../mappers/task.mapper';

/** タスクを新規作成する（アプリケーションサービス。ドメインの契約にのみ依存）。 */
@Injectable()
export class CreateTaskUseCase {
  constructor(
    @Inject(TASK_REPOSITORY)
    private readonly tasks: TaskRepository,
  ) {}

  /**
   * dto をドメイン Task に draft（開始≤終了を検証）→ Repository へ保存 → 契約 Task を返す。
   * @param userId - string（@CurrentUser 由来の所有者 ID）
   * @param dto - CreateTaskDto（ZodValidationPipe 検証済み。= 契約 TaskCreate）
   * @returns Promise<Task>（契約 Task。源: @app/api-client ← packages/api-spec/main.tsp）
   */
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
