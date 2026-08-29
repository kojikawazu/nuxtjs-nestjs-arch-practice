import { InvalidDateRangeError } from '../../domain/errors/task.errors';
import { USER } from '../../../../../test/fakes/task-fakes';
import { toCreateTaskInput } from '../inputs/create.input';
import { CreateTaskValidator } from './create.validator';
import { DateRange } from '../../domain/value-objects/date-range';

describe('CreateTaskValidator（検証のみ・保存しない）', () => {
  let validator: CreateTaskValidator;

  beforeEach(() => {
    validator = new CreateTaskValidator();
  });

  it('正常系: 検証済みの NewTask を返す（既定値を埋める。Repository に依存しない＝書き込みは構造的に不可能）', () => {
    const draft = validator.execute(
      toCreateTaskInput(USER, {
        title: '新規',
        startDate: '2026-01-10T00:00:00.000Z',
      }),
    );

    expect(draft).toEqual({
      userId: USER,
      title: '新規',
      description: null,
      status: 'todo',
      period: DateRange.of(new Date('2026-01-10T00:00:00.000Z'), null),
      url: null,
    });
    // 期間は VO なので、値そのものでも確認しておく
    expect(draft.period.start).toEqual(new Date('2026-01-10T00:00:00.000Z'));
    expect(draft.period.end).toBeNull();
  });

  it('異常系: 終了が開始より前なら InvalidDateRangeError', () => {
    expect(() =>
      validator.execute(
        toCreateTaskInput(USER, {
          title: '逆転',
          startDate: '2026-03-10T00:00:00.000Z',
          endDate: '2026-03-01T00:00:00.000Z',
        }),
      ),
    ).toThrow(InvalidDateRangeError);
  });
});
