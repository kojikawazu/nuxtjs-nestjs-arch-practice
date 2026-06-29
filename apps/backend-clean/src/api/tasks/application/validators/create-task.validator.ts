import { Injectable } from '@nestjs/common';
import { Task } from '../../domain/task';
import type { CreateTaskInput } from '../inputs/create-task.input';

/**
 * タスク作成の DryRun（検証のみ・保存しない）。
 *
 * 新規作成には所有権などの追加ルールが無いため、ドメインの不変条件（開始≤終了）だけを
 * `Task.draft` で確認する。Repository には一切触れない（書き込みが起きないことを保証）。
 * ※ ドメイン不変条件の実体は domain に残し、ここは「保存せず検証する」オーケストレーションのみ担う。
 */
@Injectable()
export class CreateTaskValidator {
  execute(input: CreateTaskInput): void {
    Task.draft(input);
  }
}
