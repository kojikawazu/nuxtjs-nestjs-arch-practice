import { TaskAccessDeniedError, TaskNotFoundError } from '../../domain/errors/task.errors';
import {
  USER,
  asImageStorage,
  asTaskAccess,
  asTaskRepo,
  buildTask,
  createImageStorageMock,
  createTaskAccessMock,
  createTaskRepoMock,
  type ImageStorageMock,
  type TaskAccessMock,
  type TaskRepoMock,
} from '../../../../../test/fakes/task-fakes';
import { DeleteTaskUseCase } from './delete.usecase';

describe('DeleteTaskUseCase', () => {
  let access: TaskAccessMock;
  let repo: TaskRepoMock;
  let storage: ImageStorageMock;
  let usecase: DeleteTaskUseCase;

  beforeEach(() => {
    access = createTaskAccessMock();
    repo = createTaskRepoMock();
    storage = createImageStorageMock();
    usecase = new DeleteTaskUseCase(
      asTaskAccess(access),
      asTaskRepo(repo),
      asImageStorage(storage),
    );
  });

  it('正常系: 所有者なら deleteById を呼ぶ', async () => {
    access.loadOwned.mockResolvedValue(buildTask());

    await usecase.execute(USER, 'task-1');

    expect(repo.deleteById).toHaveBeenCalledWith('task-1');
  });

  it('正常系: 添付画像がある場合は実体も削除する（孤立ファイルを残さない）', async () => {
    access.loadOwned.mockResolvedValue(buildTask({ imageUrl: '/uploads/task-1-abc.png' }));

    await usecase.execute(USER, 'task-1');

    expect(storage.remove).toHaveBeenCalledWith('/uploads/task-1-abc.png');
  });

  it('準正常系: 添付画像が無ければ null で呼ぶ（storage 側が no-op として扱う）', async () => {
    access.loadOwned.mockResolvedValue(buildTask({ imageUrl: null }));

    await usecase.execute(USER, 'task-1');

    expect(storage.remove).toHaveBeenCalledWith(null);
  });

  it('異常系: 存在しないタスクの削除は TaskNotFoundError で deleteById も remove もされない', async () => {
    access.loadOwned.mockRejectedValue(new TaskNotFoundError());

    await expect(usecase.execute(USER, 'missing')).rejects.toBeInstanceOf(TaskNotFoundError);
    expect(repo.deleteById).not.toHaveBeenCalled();
    expect(storage.remove).not.toHaveBeenCalled();
  });

  it('準正常系: ドメインサービスが拒否したら TaskAccessDeniedError で deleteById も remove もされない', async () => {
    access.loadOwned.mockRejectedValue(new TaskAccessDeniedError());

    await expect(usecase.execute(USER, 'task-1')).rejects.toBeInstanceOf(TaskAccessDeniedError);
    expect(repo.deleteById).not.toHaveBeenCalled();
    expect(storage.remove).not.toHaveBeenCalled();
  });
});
