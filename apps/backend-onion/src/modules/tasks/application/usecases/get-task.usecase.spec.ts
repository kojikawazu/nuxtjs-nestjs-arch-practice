import { TaskNotFoundError } from '../../domain/task.errors';
import {
  USER,
  asTaskAccess,
  buildTask,
  createTaskAccessMock,
  type TaskAccessMock,
} from '../../../../../test/fakes/task-fakes';
import { GetTaskUseCase } from './get-task.usecase';

describe('GetTaskUseCase', () => {
  let access: TaskAccessMock;
  let usecase: GetTaskUseCase;

  beforeEach(() => {
    access = createTaskAccessMock();
    usecase = new GetTaskUseCase(asTaskAccess(access));
  });

  it('正常系: ドメインサービスで取得したタスクを契約 Task にして返す', async () => {
    access.loadOwned.mockResolvedValue(buildTask());

    const result = await usecase.execute(USER, 'task-1');

    expect(access.loadOwned).toHaveBeenCalledWith(USER, 'task-1');
    expect(result.id).toBe('task-1');
  });

  it('異常系: ドメインサービスの例外（NotFound）をそのまま伝播する', async () => {
    access.loadOwned.mockRejectedValue(new TaskNotFoundError());

    await expect(usecase.execute(USER, 'missing')).rejects.toBeInstanceOf(TaskNotFoundError);
  });
});
