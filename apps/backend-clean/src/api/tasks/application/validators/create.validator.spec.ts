import { InvalidDateRangeError } from '../../domain/errors/task.errors';
import { USER } from '../../../../../test/fakes/task-fakes';
import { CreateTaskValidator } from './create.validator';

describe('CreateTaskValidator（DryRun・保存しない）', () => {
  let validator: CreateTaskValidator;

  beforeEach(() => {
    validator = new CreateTaskValidator();
  });

  it('正常系: 有効な入力なら例外を投げない（Repository に依存しない＝書き込みは構造的に不可能）', () => {
    expect(() =>
      validator.execute({
        userId: USER,
        title: '新規',
        startDate: new Date('2026-01-10T00:00:00.000Z'),
        endDate: null,
      }),
    ).not.toThrow();
  });

  it('異常系: 終了が開始より前なら InvalidDateRangeError', () => {
    expect(() =>
      validator.execute({
        userId: USER,
        title: '逆転',
        startDate: new Date('2026-03-10T00:00:00.000Z'),
        endDate: new Date('2026-03-01T00:00:00.000Z'),
      }),
    ).toThrow(InvalidDateRangeError);
  });
});
