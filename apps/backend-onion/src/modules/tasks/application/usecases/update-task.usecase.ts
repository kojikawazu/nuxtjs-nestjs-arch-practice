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

  /**
   * TaskAccessService で所有タスクをロード（不存在=404 / 非所有=403）→ 指定フィールドを適用（開始≤終了を再検証）→ 保存。
   * @param userId: string（@CurrentUser 由来の所有者 ID）
   * @param id: string（対象タスクの ID）
   * @param dto: UpdateTaskDto（ZodValidationPipe 検証済み。= 契約 TaskUpdate）
   * @returns Promise<Task>（契約 Task。源: @app/api-client ← packages/api-spec/main.tsp）
   */
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
