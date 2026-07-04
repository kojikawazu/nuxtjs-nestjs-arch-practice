import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { Task } from '@app/api-client';
import { TaskEntity } from '../../infrastructure/task.entity';
import type { UpdateTaskDto } from '../../presentation/dto/update-task.dto';
import { assertDateOrder, findOwnedTask, toContractTask } from '../task.util';

/** 自分のタスクを部分更新する（指定フィールドのみ反映し、開始≤終了を再検証）。 */
@Injectable()
export class UpdateTaskUseCase {
  constructor(
    @InjectRepository(TaskEntity)
    private readonly tasks: Repository<TaskEntity>,
  ) {}

  /**
   * findOwnedTask で所有 Entity をロード（不存在=404 / 非所有=403）→ 指定フィールドを反映 → 開始≤終了を再検証 → 保存。
   * @param userId - string（@CurrentUser 由来の所有者 ID）
   * @param id - string（対象タスクの ID）
   * @param dto - UpdateTaskDto（ZodValidationPipe 検証済み。= 契約 TaskUpdate）
   * @returns Promise<Task>（契約 Task。源: @app/api-client ← packages/api-spec/main.tsp）
   */
  async execute(userId: string, id: string, dto: UpdateTaskDto): Promise<Task> {
    const entity = await findOwnedTask(this.tasks, userId, id);
    if (dto.title !== undefined) entity.title = dto.title;
    if (dto.description !== undefined) entity.description = dto.description ?? null;
    if (dto.status !== undefined) entity.status = dto.status;
    if (dto.startDate !== undefined) entity.startDate = new Date(dto.startDate);
    if (dto.endDate !== undefined) entity.endDate = dto.endDate ? new Date(dto.endDate) : null;
    if (dto.url !== undefined) entity.url = dto.url ?? null;
    assertDateOrder(entity.startDate, entity.endDate);
    const saved = await this.tasks.save(entity);
    return toContractTask(saved);
  }
}
