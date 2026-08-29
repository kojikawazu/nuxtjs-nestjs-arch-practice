import {
  InvalidDateRangeError,
  TaskAccessDeniedError,
  TaskNotFoundError,
} from '../../domain/errors/task.errors';
import {
  USER,
  asTaskAccess,
  buildTask,
  createTaskAccessMock,
  type TaskAccessMock,
} from '../../../../../test/fakes/task-fakes';
import { UpdateTaskValidator } from './update.validator';

describe('UpdateTaskValidator（DryRun・保存しない）', () => {
  let access: TaskAccessMock;
  let validator: UpdateTaskValidator;

  beforeEach(() => {
    access = createTaskAccessMock();
    validator = new UpdateTaskValidator(asTaskAccess(access));
  });

  it('正常系: 自分のタスクなら検証を通る（resolve）', async () => {
    access.loadOwned.mockResolvedValue(buildTask());

    await expect(validator.execute(USER, 'task-1', { status: 'done' })).resolves.toBeUndefined();
    expect(access.loadOwned).toHaveBeenCalledWith(USER, 'task-1');
  });

  it('異常系: 存在しないタスクは TaskNotFoundError', async () => {
    access.loadOwned.mockRejectedValue(new TaskNotFoundError());

    await expect(validator.execute(USER, 'missing', { title: 'x' })).rejects.toBeInstanceOf(
      TaskNotFoundError,
    );
  });

  it('準正常系: 他人のタスクは TaskAccessDeniedError', async () => {
    access.loadOwned.mockRejectedValue(new TaskAccessDeniedError());

    await expect(validator.execute(USER, 'task-1', { title: 'x' })).rejects.toBeInstanceOf(
      TaskAccessDeniedError,
    );
  });

  it('異常系: マージ後に終了が開始より前なら InvalidDateRangeError', async () => {
    access.loadOwned.mockResolvedValue(buildTask()); // 既存 startDate = 2026-01-10

    await expect(
      validator.execute(USER, 'task-1', { endDate: '2026-01-05T00:00:00.000Z' }),
    ).rejects.toBeInstanceOf(InvalidDateRangeError);
  });
});
