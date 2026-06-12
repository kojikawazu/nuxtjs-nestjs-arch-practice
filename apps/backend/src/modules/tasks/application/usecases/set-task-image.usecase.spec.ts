import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
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
import { SetTaskImageUseCase } from './set-task-image.usecase';

// fs（外部 I/O）はモックする。MIME 判定・命名・認可ロジックは本物で検証する。
jest.mock('node:fs/promises');
const mkdirMock = mkdir as jest.MockedFunction<typeof mkdir>;
const writeFileMock = writeFile as jest.MockedFunction<typeof writeFile>;
const unlinkMock = unlink as jest.MockedFunction<typeof unlink>;

describe('SetTaskImageUseCase', () => {
  const UPLOAD_DIR = '/tmp/test-uploads';
  let repo: RepoMock;
  let usecase: SetTaskImageUseCase;

  const pngFile = (): Express.Multer.File =>
    ({ mimetype: 'image/png', buffer: Buffer.from('fake-png') }) as Express.Multer.File;

  beforeEach(() => {
    jest.clearAllMocks();
    mkdirMock.mockResolvedValue(undefined);
    writeFileMock.mockResolvedValue(undefined);
    unlinkMock.mockResolvedValue(undefined);
    repo = createRepoMock();
    const config = { getOrThrow: jest.fn(() => UPLOAD_DIR) } as unknown as ConfigService;
    usecase = new SetTaskImageUseCase(asRepo(repo), config);
  });

  it('正常系: サーバ生成ファイル名で保存し imageUrl を設定する', async () => {
    repo.findOne.mockResolvedValue(buildEntity());
    repo.save.mockImplementation(async (e: TaskEntity) => e);

    const result = await usecase.execute(USER, 'task-1', pngFile());

    expect(mkdirMock).toHaveBeenCalledWith(UPLOAD_DIR, { recursive: true });
    expect(writeFileMock).toHaveBeenCalledTimes(1);
    expect(result.imageUrl).toMatch(/^\/uploads\/task-1-[0-9a-f-]{36}\.png$/);
    const [writtenPath] = writeFileMock.mock.calls[0];
    expect(writtenPath).toMatch(/^\/tmp\/test-uploads\/task-1-[0-9a-f-]{36}\.png$/);
  });

  it('正常系: 既存画像があれば保存後に旧ファイルを削除する', async () => {
    repo.findOne.mockResolvedValue(buildEntity({ imageUrl: '/uploads/old-file.png' }));
    repo.save.mockImplementation(async (e: TaskEntity) => e);

    await usecase.execute(USER, 'task-1', pngFile());

    expect(unlinkMock).toHaveBeenCalledWith('/tmp/test-uploads/old-file.png');
  });

  it('異常系: 未対応 MIME は BadRequestException で書き込み・保存しない', async () => {
    repo.findOne.mockResolvedValue(buildEntity());
    const gif = { mimetype: 'image/gif', buffer: Buffer.from('x') } as Express.Multer.File;

    await expect(usecase.execute(USER, 'task-1', gif)).rejects.toBeInstanceOf(BadRequestException);
    expect(writeFileMock).not.toHaveBeenCalled();
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('異常系: 存在しないタスクは NotFoundException で書き込みしない', async () => {
    repo.findOne.mockResolvedValue(null);

    await expect(usecase.execute(USER, 'missing', pngFile())).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(writeFileMock).not.toHaveBeenCalled();
  });

  it('準正常系: 他人のタスクは ForbiddenException で書き込みしない', async () => {
    repo.findOne.mockResolvedValue(buildEntity({ userId: OTHER }));

    await expect(usecase.execute(USER, 'task-1', pngFile())).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(writeFileMock).not.toHaveBeenCalled();
  });
});
