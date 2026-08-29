import { TaskAccessDeniedError } from '../../domain/errors/task.errors';
import {
  OTHER,
  USER,
  asImageStorage,
  asTaskRepo,
  buildTask,
  createImageStorageMock,
  createTaskRepoMock,
  type ImageStorageMock,
  type TaskRepoMock,
} from '../../../../../test/fakes/task-fakes';
import { RemoveTaskImageUseCase } from './remove-image.usecase';

describe('RemoveTaskImageUseCase', () => {
  let repo: TaskRepoMock;
  let storage: ImageStorageMock;
  let usecase: RemoveTaskImageUseCase;

  beforeEach(() => {
    repo = createTaskRepoMock();
    storage = createImageStorageMock();
    usecase = new RemoveTaskImageUseCase(asTaskRepo(repo), asImageStorage(storage));
  });

  it('正常系: imageUrl をクリアし、旧パスをストレージから削除する', async () => {
    repo.findById.mockResolvedValue(buildTask({ imageUrl: '/uploads/keep.png' }));

    const result = await usecase.execute(USER, 'task-1');

    expect(result.imageUrl).toBeUndefined();
    expect(repo.update).toHaveBeenCalledTimes(1);
    expect(storage.remove).toHaveBeenCalledWith('/uploads/keep.png');
  });

  it('正常系: 画像が無い場合は remove に null を渡す（実削除は無し）', async () => {
    repo.findById.mockResolvedValue(buildTask({ imageUrl: null }));

    await usecase.execute(USER, 'task-1');

    expect(storage.remove).toHaveBeenCalledWith(null);
  });

  it('準正常系: 他人のタスクは TaskAccessDeniedError で update も remove もしない', async () => {
    repo.findById.mockResolvedValue(buildTask({ userId: OTHER, imageUrl: '/uploads/x.png' }));

    await expect(usecase.execute(USER, 'task-1')).rejects.toBeInstanceOf(TaskAccessDeniedError);
    expect(repo.update).not.toHaveBeenCalled();
    expect(storage.remove).not.toHaveBeenCalled();
  });
});
