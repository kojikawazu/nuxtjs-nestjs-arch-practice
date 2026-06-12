import { Inject, Injectable } from '@nestjs/common';
import { type NewTaskInput, type Task, TaskDraft } from '../../domain/task';
import { TASK_REPOSITORY, type TaskRepositoryPort } from '../ports/task-repository.port';

/** タスクを新規作成する（application 層のユースケース）。 */
@Injectable()
export class CreateTaskUseCase {
  constructor(
    @Inject(TASK_REPOSITORY)
    private readonly tasks: TaskRepositoryPort,
  ) {}

  async execute(input: NewTaskInput): Promise<Task> {
    // 既定値の適用・開始≤終了の検証はドメイン（TaskDraft）が担保する。
    // async にして、同期的に投げられる検証エラーも reject として一貫させる。
    const draft = TaskDraft.create(input);
    return this.tasks.create(draft);
  }
}
