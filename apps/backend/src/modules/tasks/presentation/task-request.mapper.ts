import type { NewTaskInput, TaskUpdateInput } from '../domain/task';
import type { CreateTaskDto } from './dto/create-task.dto';
import type { UpdateTaskDto } from './dto/update-task.dto';

/**
 * HTTP の入力（DTO・ISO 文字列）→ ドメインの入力（コマンド・Date）への変換（presentation 層）。
 *
 * 「文字列の日時を Date にする」「省略を null に正規化する」といった転送形式の都合を境界で吸収し、
 * application/domain には Date と null で正規化された値だけを渡す。
 */
export const TaskRequestMapper = {
  toNewTaskInput(userId: string, dto: CreateTaskDto): NewTaskInput {
    return {
      userId,
      title: dto.title,
      description: dto.description ?? null,
      status: dto.status ?? null,
      startDate: new Date(dto.startDate),
      endDate: dto.endDate ? new Date(dto.endDate) : null,
      url: dto.url ?? null,
    };
  },

  /** 指定されたキーのみを持つ部分更新コマンドを組み立てる（未指定は含めない）。 */
  toTaskUpdateInput(dto: UpdateTaskDto): TaskUpdateInput {
    const patch: TaskUpdateInput = {};
    if (dto.title !== undefined) patch.title = dto.title;
    if (dto.description !== undefined) patch.description = dto.description ?? null;
    if (dto.status !== undefined) patch.status = dto.status;
    if (dto.startDate !== undefined) patch.startDate = new Date(dto.startDate);
    if (dto.endDate !== undefined) patch.endDate = dto.endDate ? new Date(dto.endDate) : null;
    if (dto.url !== undefined) patch.url = dto.url ?? null;
    return patch;
  },
};
