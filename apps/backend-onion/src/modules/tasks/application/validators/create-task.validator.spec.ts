import { InvalidDateRangeError } from '../../domain/errors/task.errors';
import { USER, createTaskRepoMock, type TaskRepoMock } from '../../../../../test/fakes/task-fakes';
import { CreateTaskValidator } from './create-task.validator';

describe('CreateTaskValidator（DryRun・保存しない）', () => {
  let repo: TaskRepoMock;
  let validator: CreateTaskValidator;

  beforeEach(() => {
    repo = createTaskRepoMock();
    validator = new CreateTaskValidator();
  });

  it('正常系: 有効な入力なら例外を投げず、Repository に触れない', () => {
    expect(() =>
      validator.execute(USER, { title: '新規', startDate: '2026-01-10T00:00:00.000Z' }),
    ).not.toThrow();
    expect(repo.create).not.toHaveBeenCalled();
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('異常系: 終了が開始より前なら InvalidDateRangeError', () => {
    expect(() =>
      validator.execute(USER, {
        title: '逆転',
        startDate: '2026-03-10T00:00:00.000Z',
        endDate: '2026-03-01T00:00:00.000Z',
      }),
    ).toThrow(InvalidDateRangeError);
  });
});
