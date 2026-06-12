import { TaskAccessDeniedError, TaskNotFoundError } from '../../domain/task-errors';
import {
  buildTask,
  createFakeImageStorage,
  createFakeTaskRepository,
} from '../../../../../test/fakes/task-fakes';
import { SetTaskImageUseCase } from './set-task-image.usecase';

describe('SetTaskImageUseCase', () => {
  const pngFile = () => ({ mimetype: 'image/png', buffer: Buffer.from('fake-png') });

  it('正常系: ストレージへ保存し imageUrl を設定して永続化する', async () => {
    const repo = createFakeTaskRepository([buildTask({ id: 'task-1', userId: 'user-1' })]);
    const storage = createFakeImageStorage('/uploads/task-1-new.png');
    const usecase = new SetTaskImageUseCase(repo, storage);

    const result = await usecase.execute('user-1', 'task-1', pngFile());

    expect(storage.save).toHaveBeenCalledWith('task-1', pngFile());
    expect(repo.update).toHaveBeenCalledTimes(1);
    expect(result.imageUrl).toBe('/uploads/task-1-new.png');
  });

  it('正常系: 既存画像があれば保存後に旧ファイルの削除を依頼する', async () => {
    const repo = createFakeTaskRepository([
      buildTask({ id: 'task-1', userId: 'user-1', imageUrl: '/uploads/old.png' }),
    ]);
    const storage = createFakeImageStorage('/uploads/task-1-new.png');
    const usecase = new SetTaskImageUseCase(repo, storage);

    await usecase.execute('user-1', 'task-1', pngFile());

    expect(storage.remove).toHaveBeenCalledWith('/uploads/old.png');
  });

  it('異常系: 存在しないタスクは TaskNotFoundError で保存しない', async () => {
    const repo = createFakeTaskRepository();
    const storage = createFakeImageStorage();
    const usecase = new SetTaskImageUseCase(repo, storage);

    await expect(usecase.execute('user-1', 'missing', pngFile())).rejects.toBeInstanceOf(
      TaskNotFoundError,
    );
    expect(storage.save).not.toHaveBeenCalled();
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('準正常系: 他人のタスクは TaskAccessDeniedError で保存しない', async () => {
    const repo = createFakeTaskRepository([buildTask({ id: 'task-1', userId: 'user-2' })]);
    const storage = createFakeImageStorage();
    const usecase = new SetTaskImageUseCase(repo, storage);

    await expect(usecase.execute('user-1', 'task-1', pngFile())).rejects.toBeInstanceOf(
      TaskAccessDeniedError,
    );
    expect(storage.save).not.toHaveBeenCalled();
    expect(repo.update).not.toHaveBeenCalled();
  });
});
