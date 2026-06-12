import { buildTask, createFakeTaskRepository } from '../../../../../test/fakes/task-fakes';
import { ListTasksUseCase } from './list-tasks.usecase';

describe('ListTasksUseCase', () => {
  it('正常系: 自分のタスクのみを返す', async () => {
    const repo = createFakeTaskRepository([
      buildTask({ id: 'a', userId: 'user-1' }),
      buildTask({ id: 'b', userId: 'user-2' }),
    ]);
    const usecase = new ListTasksUseCase(repo);

    const result = await usecase.execute('user-1');

    expect(repo.findManyByUser).toHaveBeenCalledWith('user-1');
    expect(result.map((t) => t.id)).toEqual(['a']);
  });
});
