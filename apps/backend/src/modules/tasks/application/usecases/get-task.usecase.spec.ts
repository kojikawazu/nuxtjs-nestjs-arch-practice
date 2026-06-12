import { TaskAccessDeniedError, TaskNotFoundError } from '../../domain/task-errors';
import { buildTask, createFakeTaskRepository } from '../../../../../test/fakes/task-fakes';
import { GetTaskUseCase } from './get-task.usecase';

describe('GetTaskUseCase', () => {
  it('正常系: 自分のタスクを取得できる', async () => {
    const repo = createFakeTaskRepository([buildTask({ id: 'task-1', userId: 'user-1' })]);
    const usecase = new GetTaskUseCase(repo);

    const result = await usecase.execute('user-1', 'task-1');

    expect(result.id).toBe('task-1');
  });

  it('異常系: 存在しなければ TaskNotFoundError', async () => {
    const repo = createFakeTaskRepository();
    const usecase = new GetTaskUseCase(repo);

    await expect(usecase.execute('user-1', 'missing')).rejects.toBeInstanceOf(TaskNotFoundError);
  });

  it('準正常系: 他人のタスクは TaskAccessDeniedError', async () => {
    const repo = createFakeTaskRepository([buildTask({ id: 'task-1', userId: 'user-2' })]);
    const usecase = new GetTaskUseCase(repo);

    await expect(usecase.execute('user-1', 'task-1')).rejects.toBeInstanceOf(TaskAccessDeniedError);
  });
});
