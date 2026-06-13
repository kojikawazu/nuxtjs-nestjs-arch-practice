import {
  USER,
  asTaskRepo,
  buildTask,
  createTaskRepoMock,
  type TaskRepoMock,
} from '../../../../../test/fakes/task-fakes';
import { ListTasksUseCase } from './list-tasks.usecase';

describe('ListTasksUseCase', () => {
  let repo: TaskRepoMock;
  let usecase: ListTasksUseCase;

  beforeEach(() => {
    repo = createTaskRepoMock();
    usecase = new ListTasksUseCase(asTaskRepo(repo));
  });

  it('正常系: 契約から自分のタスクを取得し、契約 Task にマップして返す', async () => {
    repo.listByUserId.mockResolvedValue([buildTask()]);

    const result = await usecase.execute(USER);

    expect(repo.listByUserId).toHaveBeenCalledWith(USER);
    expect(result).toEqual([
      {
        id: 'task-1',
        title: '買い物',
        description: '牛乳を買う',
        status: 'todo',
        startDate: '2026-01-10T00:00:00.000Z',
        endDate: undefined,
        url: undefined,
        imageUrl: undefined,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-02T00:00:00.000Z',
      },
    ]);
  });
});
