import { Injectable } from '@nestjs/common';
import { type NewTaskInput, TaskDraft } from '../../domain/task';

/**
 * タスク作成の DryRun（検証のみ・保存しない）。
 * 新規作成には所有権などの追加ルールが無いため、ドメインの下書き生成（＝開始≤終了の検証）を
 * 通すだけでよい。Repository には一切触れない。
 */
@Injectable()
export class ValidateCreateTaskUseCase {
  execute(input: NewTaskInput): void {
    TaskDraft.create(input);
  }
}
