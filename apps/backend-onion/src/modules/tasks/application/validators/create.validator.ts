import { Injectable } from '@nestjs/common';
import { Task } from '../../domain/entities/task';
import type { CreateTaskDto } from '../../presentation/dto/create.dto';

/**
 * タスク作成の DryRun（検証のみ・保存しない）。
 * 新規作成には所有権などの追加ルールが無いため、ドメインの draft（開始≤終了）だけ確認する。
 * リポジトリには一切触れない。
 */
@Injectable()
export class CreateTaskValidator {
  /**
   * `Task.draft` で開始≤終了などの不変条件のみ検証する（Repository には触れない＝保存しない）。
   * @param _userId - string（@CurrentUser 由来の所有者 ID・検証では未使用）
   * @param dto - CreateTaskDto（ZodValidationPipe 検証済み。= 契約 TaskCreate）
   * @returns void（検証 NG は DomainError を throw）
   */
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
