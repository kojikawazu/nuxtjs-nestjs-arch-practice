import {
  USER,
  buildEntity,
  createRepoMock,
  asRepo,
  type RepoMock,
} from '../../../../../test/fakes/task-fakes';
import { ListTasksUseCase } from './list.usecase';

describe('ListTasksUseCase', () => {
  let repo: RepoMock;
  let usecase: ListTasksUseCase;

  beforeEach(() => {
    repo = createRepoMock();
    usecase = new ListTasksUseCase(asRepo(repo));
  });

  it('正常系: 自分のタスクを createdAt 降順で問い合わせ、契約 Task にマップして返す', async () => {
    repo.find.mockResolvedValue([buildEntity()]);

    const result = await usecase.execute(USER);

    expect(repo.find).toHaveBeenCalledWith({
      where: { userId: USER },
      order: { createdAt: 'DESC' },
    });
    expect(result).toEqual([
      {
        id: 'task-1',
        title: '買い物',
        description: '牛乳を買う',
        status: 'todo',
        startDate: '2026-01-10T00:00:00.000Z',
        endDate: undefined,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-02T00:00:00.000Z',
      },
    ]);
  });
});
