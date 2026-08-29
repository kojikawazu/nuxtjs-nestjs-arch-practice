import { TaskAccessDeniedError } from '../../domain/errors/task.errors';
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
import { RemoveTaskImageUseCase } from './remove-task-image.usecase';

describe('RemoveTaskImageUseCase', () => {
  let access: TaskAccessMock;
  let repo: TaskRepoMock;
  let storage: ImageStorageMock;
  let usecase: RemoveTaskImageUseCase;

  beforeEach(() => {
    access = createTaskAccessMock();
    repo = createTaskRepoMock();
    storage = createImageStorageMock();
    usecase = new RemoveTaskImageUseCase(
      asTaskAccess(access),
      asTaskRepo(repo),
      asImageStorage(storage),
    );
  });

  it('正常系: imageUrl をクリアし、旧パスをストレージから削除する', async () => {
    access.loadOwned.mockResolvedValue(buildTask({ imageUrl: '/uploads/keep.png' }));

    const result = await usecase.execute(USER, 'task-1');

    expect(result.imageUrl).toBeUndefined();
    expect(repo.update).toHaveBeenCalledTimes(1);
    expect(storage.remove).toHaveBeenCalledWith('/uploads/keep.png');
  });

  it('正常系: 画像が無い場合は remove に null を渡す（実削除は無し）', async () => {
    access.loadOwned.mockResolvedValue(buildTask({ imageUrl: null }));

    await usecase.execute(USER, 'task-1');

    expect(storage.remove).toHaveBeenCalledWith(null);
  });

  it('準正常系: ドメインサービスが拒否したら update も remove もしない', async () => {
    access.loadOwned.mockRejectedValue(new TaskAccessDeniedError());

    await expect(usecase.execute(USER, 'task-1')).rejects.toBeInstanceOf(TaskAccessDeniedError);
    expect(repo.update).not.toHaveBeenCalled();
    expect(storage.remove).not.toHaveBeenCalled();
  });
});
