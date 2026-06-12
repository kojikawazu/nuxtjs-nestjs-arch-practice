import { InvalidDateRangeError, TaskAccessDeniedError } from '../../domain/task-errors';
import { buildTask, createFakeTaskRepository } from '../../../../../test/fakes/task-fakes';
import { UpdateTaskUseCase } from './update-task.usecase';

describe('UpdateTaskUseCase', () => {
  it('正常系: 指定フィールドのみ更新して永続化する', async () => {
    const repo = createFakeTaskRepository([buildTask({ id: 'task-1', userId: 'user-1' })]);
    const usecase = new UpdateTaskUseCase(repo);

    const result = await usecase.execute('user-1', 'task-1', { status: 'done' });

    expect(repo.update).toHaveBeenCalledTimes(1);
    expect(result.status).toBe('done');
    expect(result.title).toBe('買い物'); // 未指定は元のまま
  });

  it('準正常系: 他人のタスク更新は TaskAccessDeniedError で update を呼ばない', async () => {
    const repo = createFakeTaskRepository([buildTask({ id: 'task-1', userId: 'user-2' })]);
    const usecase = new UpdateTaskUseCase(repo);

    await expect(usecase.execute('user-1', 'task-1', { title: 'x' })).rejects.toBeInstanceOf(
      TaskAccessDeniedError,
    );
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('異常系: 既存 startDate より前の endDate 指定は InvalidDateRangeError で update を呼ばない', async () => {
    // 既存 startDate = 2026-01-10。終了だけ 2026-01-05 に更新しようとすると逆転する
    const repo = createFakeTaskRepository([buildTask({ id: 'task-1', userId: 'user-1' })]);
    const usecase = new UpdateTaskUseCase(repo);

    await expect(
      usecase.execute('user-1', 'task-1', { endDate: new Date('2026-01-05T00:00:00.000Z') }),
    ).rejects.toBeInstanceOf(InvalidDateRangeError);
    expect(repo.update).not.toHaveBeenCalled();
  });
});
