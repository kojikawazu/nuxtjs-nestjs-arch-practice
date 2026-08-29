import { TaskAccessDeniedError, TaskNotFoundError } from '../../domain/errors/task.errors';
import {
  OTHER,
  USER,
  asTaskRepo,
  buildTask,
  createTaskRepoMock,
  type TaskRepoMock,
} from '../../../../../test/fakes/task-fakes';
import { DeleteTaskUseCase } from './delete.usecase';

describe('DeleteTaskUseCase', () => {
  let repo: TaskRepoMock;
  let usecase: DeleteTaskUseCase;

  beforeEach(() => {
    repo = createTaskRepoMock();
    usecase = new DeleteTaskUseCase(asTaskRepo(repo));
  });

  it('正常系: 所有者なら deleteById を呼ぶ', async () => {
    repo.findById.mockResolvedValue(buildTask());

    await usecase.execute(USER, 'task-1');

    expect(repo.deleteById).toHaveBeenCalledWith('task-1');
  });

  it('異常系: 存在しないタスクの削除は TaskNotFoundError で deleteById されない', async () => {
    repo.findById.mockResolvedValue(null);

    await expect(usecase.execute(USER, 'missing')).rejects.toBeInstanceOf(TaskNotFoundError);
    expect(repo.deleteById).not.toHaveBeenCalled();
  });

  it('準正常系: 他人のタスク削除は TaskAccessDeniedError で deleteById されない', async () => {
    repo.findById.mockResolvedValue(buildTask({ userId: OTHER }));

    await expect(usecase.execute(USER, 'task-1')).rejects.toBeInstanceOf(TaskAccessDeniedError);
    expect(repo.deleteById).not.toHaveBeenCalled();
  });
});
