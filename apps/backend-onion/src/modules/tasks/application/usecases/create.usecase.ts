import { Inject, Injectable } from '@nestjs/common';
import type { Task as TaskContract } from '@app/api-client';
import { TASK_REPOSITORY, type TaskRepository } from '../../domain/repositories/task.repository';
import type { CreateTaskDto } from '../../presentation/dto/create.dto';
import { toContractTask } from '../mappers/task.mapper';
import { CreateTaskValidator } from '../validators/create.validator';

/** タスクを新規作成する（アプリケーションサービス。ドメインの契約にのみ依存）。 */
@Injectable()
export class CreateTaskUseCase {
  constructor(
    private readonly validator: CreateTaskValidator,
    @Inject(TASK_REPOSITORY)
    private readonly tasks: TaskRepository,
  ) {}

  /**
   * Validator で検証（開始≤終了）した NewTask を Repository へ保存し、契約 Task を返す。
   * @param userId - string（@CurrentUser 由来の所有者 ID）
   * @param dto - CreateTaskDto（ZodValidationPipe 検証済み。= 契約 TaskCreate）
   * @returns Promise<Task>（契約 Task。源: @app/api-client ← packages/api-spec/main.tsp）
   */
  async execute(userId: string, dto: CreateTaskDto): Promise<TaskContract> {
    const draft = this.validator.execute(userId, dto);
    const created = await this.tasks.create(draft);
    return toContractTask(created);
  }
}
