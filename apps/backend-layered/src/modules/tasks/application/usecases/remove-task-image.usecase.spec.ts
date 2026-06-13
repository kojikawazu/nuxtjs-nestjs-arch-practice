import { unlink } from 'node:fs/promises';
import { ForbiddenException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { TaskEntity } from '../../infrastructure/task.entity';
import {
  OTHER,
  USER,
  buildEntity,
  createRepoMock,
  asRepo,
  type RepoMock,
} from '../../../../../test/fakes/task-fakes';
import { RemoveTaskImageUseCase } from './remove-task-image.usecase';

// fs（外部 I/O）はモックする。認可・状態遷移ロジックは本物で検証する。
jest.mock('node:fs/promises');
const unlinkMock = unlink as jest.MockedFunction<typeof unlink>;

describe('RemoveTaskImageUseCase', () => {
  const UPLOAD_DIR = '/tmp/test-uploads';
  let repo: RepoMock;
  let usecase: RemoveTaskImageUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    unlinkMock.mockResolvedValue(undefined);
    repo = createRepoMock();
    const config = { getOrThrow: jest.fn(() => UPLOAD_DIR) } as unknown as ConfigService;
    usecase = new RemoveTaskImageUseCase(asRepo(repo), config);
  });

  it('正常系: imageUrl をクリアして実ファイルを削除する', async () => {
    repo.findOne.mockResolvedValue(buildEntity({ imageUrl: '/uploads/keep.png' }));
    repo.save.mockImplementation(async (e: TaskEntity) => e);

    const result = await usecase.execute(USER, 'task-1');

    expect(result.imageUrl).toBeUndefined();
    expect(unlinkMock).toHaveBeenCalledWith('/tmp/test-uploads/keep.png');
  });

  it('正常系: 画像が無い場合は unlink を呼ばない', async () => {
    repo.findOne.mockResolvedValue(buildEntity({ imageUrl: null }));
    repo.save.mockImplementation(async (e: TaskEntity) => e);

    await usecase.execute(USER, 'task-1');

    expect(unlinkMock).not.toHaveBeenCalled();
  });

  it('準正常系: 他人のタスクは ForbiddenException で save も unlink もしない', async () => {
    repo.findOne.mockResolvedValue(buildEntity({ userId: OTHER, imageUrl: '/uploads/x.png' }));

    await expect(usecase.execute(USER, 'task-1')).rejects.toBeInstanceOf(ForbiddenException);
    expect(repo.save).not.toHaveBeenCalled();
    expect(unlinkMock).not.toHaveBeenCalled();
  });
});
