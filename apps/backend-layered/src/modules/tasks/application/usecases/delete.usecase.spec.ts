import { unlink } from 'node:fs/promises';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import {
  OTHER,
  USER,
  buildEntity,
  createRepoMock,
  asRepo,
  type RepoMock,
} from '../../../../../test/fakes/task-fakes';
import { DeleteTaskUseCase } from './delete.usecase';

// fs（外部 I/O）はモックする。認可・削除順序のロジックは本物で検証する。
jest.mock('node:fs/promises');
const unlinkMock = unlink as jest.MockedFunction<typeof unlink>;

describe('DeleteTaskUseCase', () => {
  const UPLOAD_DIR = '/tmp/test-uploads';
  let repo: RepoMock;
  let usecase: DeleteTaskUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    unlinkMock.mockResolvedValue(undefined);
    repo = createRepoMock();
    const config = { getOrThrow: jest.fn(() => UPLOAD_DIR) } as unknown as ConfigService;
    usecase = new DeleteTaskUseCase(asRepo(repo), config);
  });

  it('正常系: 所有者なら delete を呼ぶ', async () => {
    repo.findOne.mockResolvedValue(buildEntity());

    await usecase.execute(USER, 'task-1');

    expect(repo.delete).toHaveBeenCalledWith({ id: 'task-1' });
  });

  it('正常系: 添付画像がある場合は実体も削除する（孤立ファイルを残さない）', async () => {
    repo.findOne.mockResolvedValue(buildEntity({ imageUrl: '/uploads/task-1-abc.png' }));

    await usecase.execute(USER, 'task-1');

    expect(unlinkMock).toHaveBeenCalledWith('/tmp/test-uploads/task-1-abc.png');
  });

  it('準正常系: 添付画像が無ければ unlink しない', async () => {
    repo.findOne.mockResolvedValue(buildEntity({ imageUrl: null }));

    await usecase.execute(USER, 'task-1');

    expect(unlinkMock).not.toHaveBeenCalled();
  });

  it('準正常系: 実ファイルが既に無くても削除は成功する（掃除の失敗で本処理を巻き戻さない）', async () => {
    repo.findOne.mockResolvedValue(buildEntity({ imageUrl: '/uploads/gone.png' }));
    unlinkMock.mockRejectedValue(new Error('ENOENT'));

    await expect(usecase.execute(USER, 'task-1')).resolves.toBeUndefined();
    expect(repo.delete).toHaveBeenCalledWith({ id: 'task-1' });
  });

  it('異常系: 存在しないタスクの削除は NotFoundException で delete も unlink もされない', async () => {
    repo.findOne.mockResolvedValue(null);

    await expect(usecase.execute(USER, 'missing')).rejects.toBeInstanceOf(NotFoundException);
    expect(repo.delete).not.toHaveBeenCalled();
    expect(unlinkMock).not.toHaveBeenCalled();
  });

  it('準正常系: 他人のタスク削除は ForbiddenException で delete も unlink もされない', async () => {
    repo.findOne.mockResolvedValue(buildEntity({ userId: OTHER }));

    await expect(usecase.execute(USER, 'task-1')).rejects.toBeInstanceOf(ForbiddenException);
    expect(repo.delete).not.toHaveBeenCalled();
    expect(unlinkMock).not.toHaveBeenCalled();
  });
});
