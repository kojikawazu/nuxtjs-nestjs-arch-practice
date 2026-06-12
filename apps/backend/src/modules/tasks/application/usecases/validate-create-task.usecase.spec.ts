import type { NewTaskInput } from '../../domain/task';
import { InvalidDateRangeError } from '../../domain/task-errors';
import { ValidateCreateTaskUseCase } from './validate-create-task.usecase';

describe('ValidateCreateTaskUseCase（DryRun・保存しない）', () => {
  const input = (overrides: Partial<NewTaskInput> = {}): NewTaskInput => ({
    userId: 'user-1',
    title: '新規',
    description: null,
    status: null,
    startDate: new Date('2026-01-10T00:00:00.000Z'),
    endDate: null,
    url: null,
    ...overrides,
  });

  it('正常系: 有効な入力なら例外を投げない（Repository に触れない）', () => {
    const usecase = new ValidateCreateTaskUseCase();
    expect(() => usecase.execute(input())).not.toThrow();
  });

  it('異常系: 終了が開始より前なら InvalidDateRangeError', () => {
    const usecase = new ValidateCreateTaskUseCase();
    expect(() =>
      usecase.execute(
        input({
          startDate: new Date('2026-03-10T00:00:00.000Z'),
          endDate: new Date('2026-03-01T00:00:00.000Z'),
        }),
      ),
    ).toThrow(InvalidDateRangeError);
  });
});
