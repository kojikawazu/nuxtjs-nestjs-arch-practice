import { Injectable } from '@nestjs/common';
import { type NewTask, Task } from '../../domain/entities/task';
import type { CreateTaskInput } from '../inputs/create.input';

/**
 * タスク作成の業務ルール検証（保存はしない）。
 *
 * 新規作成には所有権などの追加ルールが無いため、ドメインの不変条件（開始≤終了）だけを
 * `Task.draft` で確認する。Repository には一切触れない（書き込みが起きないことを保証）。
 * DryRun（`POST /tasks/validate`）と本登録（`POST /tasks`）の双方がここを通る**唯一の検証実体**で、
 * 両経路の判定が食い違わないことを構造的に保証する。
 * ※ ドメイン不変条件の実体は domain に残し、ここは「保存せず検証する」オーケストレーションのみ担う。
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
