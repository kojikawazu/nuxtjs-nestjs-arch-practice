import { TaskAccessDeniedError, TaskNotFoundError } from '../../domain/task.errors';
import {
  OTHER,
  USER,
  asTaskRepo,
  buildTask,
  createTaskRepoMock,
  type TaskRepoMock,
} from '../../../../../test/fakes/task-fakes';
import { GetTaskUseCase } from './get-task.usecase';

describe('GetTaskUseCase', () => {
  let repo: TaskRepoMock;
  let usecase: GetTaskUseCase;

  beforeEach(() => {
    repo = createTaskRepoMock();
    usecase = new GetTaskUseCase(asTaskRepo(repo));
  });

  it('正常系: 自分のタスクを取得できる', async () => {
    repo.findById.mockResolvedValue(buildTask());

    const result = await usecase.execute(USER, 'task-1');

    expect(result.id).toBe('task-1');
  });

  it('異常系: 存在しなければ TaskNotFoundError', async () => {
    repo.findById.mockResolvedValue(null);

    await expect(usecase.execute(USER, 'missing')).rejects.toBeInstanceOf(TaskNotFoundError);
  });

  it('準正常系: 他人のタスクは TaskAccessDeniedError', async () => {
    repo.findById.mockResolvedValue(buildTask({ userId: OTHER }));

    await expect(usecase.execute(USER, 'task-1')).rejects.toBeInstanceOf(TaskAccessDeniedError);
  });
});
