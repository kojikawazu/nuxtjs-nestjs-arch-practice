import { Injectable } from '@nestjs/common';
import { type NewTask, Task } from '../../domain/entities/task';
import type { CreateTaskDto } from '../../presentation/dto/create.dto';

/**
 * タスク作成の業務ルール検証（保存はしない）。
 * 新規作成には所有権などの追加ルールが無いため、ドメインの draft（開始≤終了）だけ確認する。
 * リポジトリには一切触れない。
 * DryRun（`POST /tasks/validate`）と本登録（`POST /tasks`）の双方がここを通る**唯一の検証実体**で、
 * 両経路の判定が食い違わないことを構造的に保証する。
 */
@Injectable()
export class CreateTaskValidator {
  /**
   * `Task.draft` で開始≤終了などの不変条件を検証し、保存可能な NewTask を返す（Repository には触れない）。
   * @param userId - string（@CurrentUser 由来の所有者 ID）
   * @param dto - CreateTaskDto（ZodValidationPipe 検証済み。= 契約 TaskCreate）
   * @returns NewTask（検証済みの新規作成属性。保存は呼び出し側の責務。検証 NG は DomainError を throw）
   */
  execute(userId: string, dto: CreateTaskDto): NewTask {
    return Task.draft({
      userId,
      title: dto.title,
      description: dto.description,
      status: dto.status,
      startDate: new Date(dto.startDate),
      endDate: dto.endDate ? new Date(dto.endDate) : null,
      url: dto.url,
    });
  }
}
