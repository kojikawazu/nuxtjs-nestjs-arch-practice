import {
  InvalidDateRangeError,
  TaskAccessDeniedError,
  TaskNotFoundError,
} from '../../domain/task-errors';
import { buildTask, createFakeTaskRepository } from '../../../../../test/fakes/task-fakes';
import { ValidateUpdateTaskUseCase } from './validate-update-task.usecase';

describe('ValidateUpdateTaskUseCase（DryRun・保存しない）', () => {
  it('正常系: 自分のタスクなら通り、update を呼ばない', async () => {
    const repo = createFakeTaskRepository([buildTask({ id: 'task-1', userId: 'user-1' })]);
    const usecase = new ValidateUpdateTaskUseCase(repo);

    await expect(usecase.execute('user-1', 'task-1', { status: 'done' })).resolves.toBeUndefined();
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('異常系: 存在しないタスクは TaskNotFoundError', async () => {
    const repo = createFakeTaskRepository();
    const usecase = new ValidateUpdateTaskUseCase(repo);

    await expect(usecase.execute('user-1', 'missing', { title: 'x' })).rejects.toBeInstanceOf(
      TaskNotFoundError,
    );
  });

  it('準正常系: 他人のタスクは TaskAccessDeniedError で update を呼ばない', async () => {
    const repo = createFakeTaskRepository([buildTask({ id: 'task-1', userId: 'user-2' })]);
    const usecase = new ValidateUpdateTaskUseCase(repo);

    await expect(usecase.execute('user-1', 'task-1', { title: 'x' })).rejects.toBeInstanceOf(
      TaskAccessDeniedError,
    );
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('異常系: マージ後に終了が開始より前なら InvalidDateRangeError', async () => {
    const repo = createFakeTaskRepository([buildTask({ id: 'task-1', userId: 'user-1' })]);
    const usecase = new ValidateUpdateTaskUseCase(repo);

    await expect(
      usecase.execute('user-1', 'task-1', { endDate: new Date('2026-01-05T00:00:00.000Z') }),
    ).rejects.toBeInstanceOf(InvalidDateRangeError);
  });
});
