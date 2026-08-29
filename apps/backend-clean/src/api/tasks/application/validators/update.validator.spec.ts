import {
  InvalidDateRangeError,
  TaskAccessDeniedError,
  TaskNotFoundError,
} from '../../domain/errors/task.errors';
import {
  OTHER,
  USER,
  asTaskRepo,
  buildTask,
  createTaskRepoMock,
  type TaskRepoMock,
} from '../../../../../test/fakes/task-fakes';
import { UpdateTaskValidator } from './update.validator';

describe('UpdateTaskValidator（検証のみ・保存しない）', () => {
  let repo: TaskRepoMock;
  let validator: UpdateTaskValidator;

  beforeEach(() => {
    repo = createTaskRepoMock();
    validator = new UpdateTaskValidator(asTaskRepo(repo));
  });

  it('正常系: 更新を適用した Task を返し、update は呼ばない（保存しない）', async () => {
    repo.findById.mockResolvedValue(buildTask());

    const task = await validator.execute({ userId: USER, id: 'task-1', status: 'done' });

    expect(repo.findById).toHaveBeenCalledWith('task-1');
    expect(repo.update).not.toHaveBeenCalled();
    // 返る Task は更新適用済み（未指定フィールドは元の値のまま）
    expect(task.toState().status).toBe('done');
    expect(task.toState().title).toBe('買い物');
  });

  it('異常系: 存在しないタスクは TaskNotFoundError で update されない', async () => {
    repo.findById.mockResolvedValue(null);

    await expect(
      validator.execute({ userId: USER, id: 'missing', title: 'x' }),
    ).rejects.toBeInstanceOf(TaskNotFoundError);
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('準正常系: 他人のタスクは TaskAccessDeniedError で update されない', async () => {
    repo.findById.mockResolvedValue(buildTask({ userId: OTHER }));

    await expect(
      validator.execute({ userId: USER, id: 'task-1', title: 'x' }),
    ).rejects.toBeInstanceOf(TaskAccessDeniedError);
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('異常系: マージ後に終了が開始より前なら InvalidDateRangeError', async () => {
    repo.findById.mockResolvedValue(buildTask()); // 既存 startDate = 2026-01-10

    await expect(
      validator.execute({
        userId: USER,
        id: 'task-1',
        endDate: new Date('2026-01-05T00:00:00.000Z'),
      }),
    ).rejects.toBeInstanceOf(InvalidDateRangeError);
    expect(repo.update).not.toHaveBeenCalled();
  });
});
