import {
  OTHER,
  USER,
  asTaskRepo,
  buildTask,
  createTaskRepoMock,
  type TaskRepoMock,
} from '../../../../../test/fakes/task-fakes';
import { TaskAccessDeniedError, TaskNotFoundError } from '../../domain/errors/task.errors';
import { TaskAccessService } from './task-access.service';

describe('TaskAccessService（ドメインサービス）', () => {
  let repo: TaskRepoMock;
  let service: TaskAccessService;

  beforeEach(() => {
    repo = createTaskRepoMock();
    service = new TaskAccessService(asTaskRepo(repo));
  });

  it('正常系: 所有者なら Task を返す', async () => {
    repo.findById.mockResolvedValue(buildTask());

    const task = await service.loadOwned(USER, 'task-1');

    expect(task.id).toBe('task-1');
    expect(repo.findById).toHaveBeenCalledWith('task-1');
  });

  it('異常系: 存在しなければ TaskNotFoundError', async () => {
    repo.findById.mockResolvedValue(null);

    await expect(service.loadOwned(USER, 'missing')).rejects.toBeInstanceOf(TaskNotFoundError);
  });

  it('準正常系: 他人のタスクは TaskAccessDeniedError', async () => {
    repo.findById.mockResolvedValue(buildTask({ userId: OTHER }));

    await expect(service.loadOwned(USER, 'task-1')).rejects.toBeInstanceOf(TaskAccessDeniedError);
  });
});
