import { TaskAccessDeniedError } from '../../domain/task.errors';
import {
  USER,
  asTaskAccess,
  asTaskRepo,
  buildTask,
  createTaskAccessMock,
  createTaskRepoMock,
  type TaskAccessMock,
  type TaskRepoMock,
} from '../../../../../test/fakes/task-fakes';
import { DeleteTaskUseCase } from './delete-task.usecase';

describe('DeleteTaskUseCase', () => {
  let access: TaskAccessMock;
  let repo: TaskRepoMock;
  let usecase: DeleteTaskUseCase;

  beforeEach(() => {
    access = createTaskAccessMock();
    repo = createTaskRepoMock();
    usecase = new DeleteTaskUseCase(asTaskAccess(access), asTaskRepo(repo));
  });

  it('正常系: 所有タスクを取得し deleteById を呼ぶ', async () => {
    access.loadOwned.mockResolvedValue(buildTask());

    await usecase.execute(USER, 'task-1');

    expect(repo.deleteById).toHaveBeenCalledWith('task-1');
  });

  it('準正常系: ドメインサービスが拒否したら deleteById されない', async () => {
    access.loadOwned.mockRejectedValue(new TaskAccessDeniedError());

    await expect(usecase.execute(USER, 'task-1')).rejects.toBeInstanceOf(TaskAccessDeniedError);
    expect(repo.deleteById).not.toHaveBeenCalled();
  });
});
