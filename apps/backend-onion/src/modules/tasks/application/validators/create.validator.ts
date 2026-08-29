import { Injectable } from '@nestjs/common';
import { type NewTask, Task } from '../../domain/entities/task';
import type { CreateTaskInput } from '../inputs/create.input';

/**
 * タスク作成の業務ルール検証（保存はしない）。
 * 新規作成には所有権などの追加ルールが無いため、ドメインの draft（開始≤終了）だけ確認する。
 * リポジトリには一切触れない。
 * UseCase はこの Validator を通してから保存するため、検証の実体はここ 1 か所に集まる。
 */
@Injectable()
export class CreateTaskValidator {
  /**
   * `Task.draft` で開始≤終了などの不変条件を検証し、保存可能な NewTask を返す（Repository には触れない）。
   * @param input - CreateTaskInput（Controller が契約 TaskCreate から変換した Command）
   * @returns NewTask（検証済みの新規作成属性。保存は呼び出し側の責務。検証 NG は DomainError を throw）
   */
  execute(input: CreateTaskInput): NewTask {
    return Task.draft(input);
  }
}
