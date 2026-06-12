import { Injectable } from '@nestjs/common';
import type { CreateTaskDto } from '../../presentation/dto/create-task.dto';
import { assertDateOrder } from '../task.util';

/**
 * タスク作成の DryRun（検証のみ・保存しない）。
 * 新規作成には所有権などの追加ルールが無いため、開始≤終了の業務ルールだけ確認する。
 */
@Injectable()
export class ValidateCreateTaskUseCase {
  execute(_userId: string, dto: CreateTaskDto): void {
    const startDate = new Date(dto.startDate);
    const endDate = dto.endDate ? new Date(dto.endDate) : null;
    assertDateOrder(startDate, endDate);
  }
}
