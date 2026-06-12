import { TaskAccessDeniedError, TaskNotFoundError } from '../../domain/task-errors';
import { buildTask, createFakeTaskRepository } from '../../../../../test/fakes/task-fakes';
import { DeleteTaskUseCase } from './delete-task.usecase';

describe('DeleteTaskUseCase', () => {
  it('正常系: 所有者なら deleteById を呼ぶ', async () => {
    const repo = createFakeTaskRepository([buildTask({ id: 'task-1', userId: 'user-1' })]);
    const usecase = new DeleteTaskUseCase(repo);

    await usecase.execute('user-1', 'task-1');

    expect(repo.deleteById).toHaveBeenCalledWith('task-1');
  });

  it('異常系: 存在しないタスクは TaskNotFoundError で deleteById を呼ばない', async () => {
    const repo = createFakeTaskRepository();
    const usecase = new DeleteTaskUseCase(repo);

    await expect(usecase.execute('user-1', 'missing')).rejects.toBeInstanceOf(TaskNotFoundError);
    expect(repo.deleteById).not.toHaveBeenCalled();
  });

  it('準正常系: 他人のタスク削除は TaskAccessDeniedError で deleteById を呼ばない', async () => {
    const repo = createFakeTaskRepository([buildTask({ id: 'task-1', userId: 'user-2' })]);
    const usecase = new DeleteTaskUseCase(repo);

    await expect(usecase.execute('user-1', 'task-1')).rejects.toBeInstanceOf(TaskAccessDeniedError);
    expect(repo.deleteById).not.toHaveBeenCalled();
  });
});
