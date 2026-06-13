import { Injectable } from '@nestjs/common';
import { Task } from '../../domain/task';
import type { CreateTaskDto } from '../../presentation/dto/create-task.dto';

/**
 * タスク作成の DryRun（検証のみ・保存しない）。
 * 新規作成には所有権などの追加ルールが無いため、ドメインの draft（開始≤終了）だけ確認する。
 * リポジトリには一切触れない。
 */
@Injectable()
export class ValidateCreateTaskUseCase {
  execute(_userId: string, dto: CreateTaskDto): void {
    Task.draft({
      userId: _userId,
      title: dto.title,
      description: dto.description,
      status: dto.status,
      startDate: new Date(dto.startDate),
      endDate: dto.endDate ? new Date(dto.endDate) : null,
      url: dto.url,
    });
  }
}
