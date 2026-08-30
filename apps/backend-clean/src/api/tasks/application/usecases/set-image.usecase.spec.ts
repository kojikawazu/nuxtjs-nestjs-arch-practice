import { TaskAccessDeniedError, TaskNotFoundError } from '../../domain/errors/task.errors';
import type { ImageFile } from '../ports/image-storage.port';
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
import { SetTaskImageUseCase } from './set-image.usecase';

describe('SetTaskImageUseCase', () => {
  let repo: TaskRepoMock;
  let storage: ImageStorageMock;
  let usecase: SetTaskImageUseCase;

  const pngFile = (): ImageFile => ({ mimetype: 'image/png', buffer: Buffer.from('fake-png') });

  beforeEach(() => {
    repo = createTaskRepoMock();
    storage = createImageStorageMock();
    usecase = new SetTaskImageUseCase(asTaskRepo(repo), asImageStorage(storage));
  });

  it('正常系: ストレージへ保存し、返ったパスを imageUrl に設定して update する', async () => {
    repo.findById.mockResolvedValue(buildTask());
    storage.save.mockResolvedValue('/uploads/task-1-generated.png');

    const result = await usecase.execute(USER, 'task-1', pngFile());

    expect(storage.save).toHaveBeenCalledWith('task-1', pngFile());
    expect(repo.update).toHaveBeenCalledTimes(1);
    expect(result.imageUrl).toBe('/uploads/task-1-generated.png');
  });

  it('正常系: 既存画像があれば保存後に旧パスを掃除する', async () => {
    repo.findById.mockResolvedValue(buildTask({ imageUrl: '/uploads/old-file.png' }));
    storage.save.mockResolvedValue('/uploads/task-1-new.png');

    await usecase.execute(USER, 'task-1', pngFile());

    expect(storage.remove).toHaveBeenCalledWith('/uploads/old-file.png');
  });

  it('異常系: 存在しないタスクは TaskNotFoundError で保存しない', async () => {
    repo.findById.mockResolvedValue(null);

    await expect(usecase.execute(USER, 'missing', pngFile())).rejects.toBeInstanceOf(
      TaskNotFoundError,
    );
    expect(storage.save).not.toHaveBeenCalled();
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('準正常系: 他人のタスクは TaskAccessDeniedError で保存しない', async () => {
    repo.findById.mockResolvedValue(buildTask({ userId: OTHER }));

    await expect(usecase.execute(USER, 'task-1', pngFile())).rejects.toBeInstanceOf(
      TaskAccessDeniedError,
    );
    expect(storage.save).not.toHaveBeenCalled();
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('準正常系: 保存に失敗したら直前に書いた新ファイルを消し、元のエラーを投げ直す', async () => {
    repo.findById.mockResolvedValue(buildTask({ imageUrl: '/uploads/old-file.png' }));
    storage.save.mockResolvedValue('/uploads/task-1-new.png');
    const dbError = new Error('db is down');
    repo.update.mockRejectedValue(dbError);

    await expect(usecase.execute(USER, 'task-1', pngFile())).rejects.toBe(dbError);
    // 消すのは書いたばかりの新ファイルだけ。旧ファイルはまだ imageUrl から参照されている
    expect(storage.remove).toHaveBeenCalledTimes(1);
    expect(storage.remove).toHaveBeenCalledWith('/uploads/task-1-new.png');
  });

  it('異常系: 補償削除まで失敗しても、元の保存エラーが投げられる（原因をすり替えない）', async () => {
    repo.findById.mockResolvedValue(buildTask());
    storage.save.mockResolvedValue('/uploads/task-1-new.png');
    const dbError = new Error('db is down');
    repo.update.mockRejectedValue(dbError);
    storage.remove.mockRejectedValue(new Error('storage is down'));

    await expect(usecase.execute(USER, 'task-1', pngFile())).rejects.toBe(dbError);
  });
});
