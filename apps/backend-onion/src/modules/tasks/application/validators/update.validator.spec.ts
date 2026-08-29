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

describe('UpdateTaskValidator（検証のみ・保存しない）', () => {
  let access: TaskAccessMock;
  let validator: UpdateTaskValidator;

  beforeEach(() => {
    access = createTaskAccessMock();
    validator = new UpdateTaskValidator(asTaskAccess(access));
  });

  it('正常系: 更新を適用した Task を返す（保存はしない）', async () => {
    access.loadOwned.mockResolvedValue(buildTask());

    const task = await validator.execute(USER, 'task-1', { status: 'done' });

    expect(access.loadOwned).toHaveBeenCalledWith(USER, 'task-1');
    // 返る Task は更新適用済み（未指定フィールドは元の値のまま）
    expect(task.toState().status).toBe('done');
    expect(task.toState().title).toBe('買い物');
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
