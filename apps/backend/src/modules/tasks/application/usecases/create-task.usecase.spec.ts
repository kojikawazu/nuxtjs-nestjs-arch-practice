import type { NewTaskInput } from '../../domain/task';
import { InvalidDateRangeError } from '../../domain/task-errors';
import { createFakeTaskRepository } from '../../../../../test/fakes/task-fakes';
import { CreateTaskUseCase } from './create-task.usecase';

describe('CreateTaskUseCase', () => {
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

  it('正常系: status 未指定は todo で永続化され、採番済みドメインを返す', async () => {
    const repo = createFakeTaskRepository();
    const usecase = new CreateTaskUseCase(repo);

    const result = await usecase.execute(input({ title: '買い物' }));

    expect(repo.create).toHaveBeenCalledTimes(1);
    expect(result.id).toBe('task-1');
    expect(result.status).toBe('todo');
    expect(result.title).toBe('買い物');
  });

  it('正常系: url を指定するとそのまま保存される', async () => {
    const repo = createFakeTaskRepository();
    const usecase = new CreateTaskUseCase(repo);

    const result = await usecase.execute(input({ url: 'https://example.com/docs' }));

    expect(result.url).toBe('https://example.com/docs');
  });

  it('異常系: 終了が開始より前なら InvalidDateRangeError で create を呼ばない', async () => {
    const repo = createFakeTaskRepository();
    const usecase = new CreateTaskUseCase(repo);

    await expect(
      usecase.execute(
        input({
          startDate: new Date('2026-03-10T00:00:00.000Z'),
          endDate: new Date('2026-03-01T00:00:00.000Z'),
        }),
      ),
    ).rejects.toBeInstanceOf(InvalidDateRangeError);
    expect(repo.create).not.toHaveBeenCalled();
  });
});
