import { Inject, Injectable } from '@nestjs/common';
import type { Task as TaskContract } from '@app/api-client';
import { TASK_REPOSITORY, type TaskRepository } from '../../domain/repositories/task.repository';
import type { UpdateTaskDto } from '../../presentation/dto/update.dto';
import { toContractTask } from '../mappers/task.mapper';
import { UpdateTaskValidator } from '../validators/update.validator';

/** 自分のタスクを部分更新する（指定フィールドのみ反映し、開始≤終了を再検証）。 */
@Injectable()
export class UpdateTaskUseCase {
  constructor(
    private readonly validator: UpdateTaskValidator,
    @Inject(TASK_REPOSITORY)
    private readonly tasks: TaskRepository,
  ) {}

  /**
   * Validator がロード（不存在=404 / 非所有=403）・更新適用・検証まで済ませた Task を保存し、契約 Task を返す。
   * Validator が検証済み Task を返すため、ここで読み直さない（SELECT は 1 回）。
   * @param userId - string（@CurrentUser 由来の所有者 ID）
   * @param id - string（対象タスクの ID）
   * @param dto - UpdateTaskDto（ZodValidationPipe 検証済み。= 契約 TaskUpdate）
   * @returns Promise<Task>（契約 Task。源: @app/api-client ← packages/api-spec/main.tsp）
   */
  async execute(userId: string, id: string, dto: UpdateTaskDto): Promise<TaskContract> {
    const task = await this.validator.execute(userId, id, dto);
    const saved = await this.tasks.update(task);
    return toContractTask(saved);
  }
}
