import { TaskAccessDeniedError } from '../../domain/task-errors';
import {
  buildTask,
  createFakeImageStorage,
  createFakeTaskRepository,
} from '../../../../../test/fakes/task-fakes';
import { RemoveTaskImageUseCase } from './remove-task-image.usecase';

describe('RemoveTaskImageUseCase', () => {
  it('正常系: imageUrl をクリアし、旧ファイルの削除を依頼する', async () => {
    const repo = createFakeTaskRepository([
      buildTask({ id: 'task-1', userId: 'user-1', imageUrl: '/uploads/keep.png' }),
    ]);
    const storage = createFakeImageStorage();
    const usecase = new RemoveTaskImageUseCase(repo, storage);

    const result = await usecase.execute('user-1', 'task-1');

    expect(result.imageUrl).toBeNull();
    expect(storage.remove).toHaveBeenCalledWith('/uploads/keep.png');
  });

  it('正常系: 画像が無い場合は remove に null を渡す（実体削除なし）', async () => {
    const repo = createFakeTaskRepository([
      buildTask({ id: 'task-1', userId: 'user-1', imageUrl: null }),
    ]);
    const storage = createFakeImageStorage();
    const usecase = new RemoveTaskImageUseCase(repo, storage);

    await usecase.execute('user-1', 'task-1');

    expect(storage.remove).toHaveBeenCalledWith(null);
  });

  it('準正常系: 他人のタスクは TaskAccessDeniedError で update も remove も呼ばない', async () => {
    const repo = createFakeTaskRepository([
      buildTask({ id: 'task-1', userId: 'user-2', imageUrl: '/uploads/x.png' }),
    ]);
    const storage = createFakeImageStorage();
    const usecase = new RemoveTaskImageUseCase(repo, storage);

    await expect(usecase.execute('user-1', 'task-1')).rejects.toBeInstanceOf(TaskAccessDeniedError);
    expect(repo.update).not.toHaveBeenCalled();
    expect(storage.remove).not.toHaveBeenCalled();
  });
});
