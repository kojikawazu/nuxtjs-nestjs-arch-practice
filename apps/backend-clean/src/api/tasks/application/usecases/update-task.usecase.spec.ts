import { InvalidDateRangeError, TaskAccessDeniedError } from '../../domain/errors/task.errors';
import {
  OTHER,
  USER,
  asTaskRepo,
  buildTask,
  createTaskRepoMock,
  type TaskRepoMock,
} from '../../../../../test/fakes/task-fakes';
import { UpdateTaskUseCase } from './update-task.usecase';

describe('UpdateTaskUseCase', () => {
  let repo: TaskRepoMock;
  let usecase: UpdateTaskUseCase;

  beforeEach(() => {
    repo = createTaskRepoMock();
    usecase = new UpdateTaskUseCase(asTaskRepo(repo));
  });

  it('正常系: 指定フィールドのみ更新する（未指定は元のまま）', async () => {
    repo.findById.mockResolvedValue(buildTask());

    const result = await usecase.execute({ userId: USER, id: 'task-1', status: 'done' });

    expect(repo.update).toHaveBeenCalledTimes(1);
    expect(result.status).toBe('done');
    expect(result.title).toBe('買い物');
  });

  it('正常系: url を指定すると更新され、契約 Task に反映される', async () => {
    repo.findById.mockResolvedValue(buildTask());

    const result = await usecase.execute({
      userId: USER,
      id: 'task-1',
      url: 'https://example.org/a',
    });

    expect(result.url).toBe('https://example.org/a');
  });

  it('準正常系: 他人のタスク更新は TaskAccessDeniedError で update されない', async () => {
    repo.findById.mockResolvedValue(buildTask({ userId: OTHER }));

    await expect(
      usecase.execute({ userId: USER, id: 'task-1', title: 'x' }),
    ).rejects.toBeInstanceOf(TaskAccessDeniedError);
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('異常系: 既存 startDate より前の endDate 指定は InvalidDateRangeError で update されない', async () => {
    repo.findById.mockResolvedValue(buildTask()); // 既存 startDate = 2026-01-10

    await expect(
      usecase.execute({
        userId: USER,
        id: 'task-1',
        endDate: new Date('2026-01-05T00:00:00.000Z'),
      }),
    ).rejects.toBeInstanceOf(InvalidDateRangeError);
    expect(repo.update).not.toHaveBeenCalled();
  });
});
