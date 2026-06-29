import { mkdir, unlink, writeFile } from 'node:fs/promises';
import type { ConfigService } from '@nestjs/config';
import type { ImageFile } from '../application/ports/image-storage.port';
import { UnsupportedImageTypeError } from '../domain/task.errors';
import { LocalImageStorage } from './local-image-storage';

// fs（外部 I/O）はモックする。MIME 判定・命名・パス組み立てロジックは本物で検証する。
jest.mock('node:fs/promises');
const mkdirMock = mkdir as jest.MockedFunction<typeof mkdir>;
const writeFileMock = writeFile as jest.MockedFunction<typeof writeFile>;
const unlinkMock = unlink as jest.MockedFunction<typeof unlink>;

describe('LocalImageStorage', () => {
  const UPLOAD_DIR = '/tmp/test-uploads';
  let storage: LocalImageStorage;

  const pngFile = (): ImageFile => ({ mimetype: 'image/png', buffer: Buffer.from('fake-png') });

  beforeEach(() => {
    jest.clearAllMocks();
    mkdirMock.mockResolvedValue(undefined);
    writeFileMock.mockResolvedValue(undefined);
    unlinkMock.mockResolvedValue(undefined);
    const config = { getOrThrow: jest.fn(() => UPLOAD_DIR) } as unknown as ConfigService;
    storage = new LocalImageStorage(config);
  });

  it('正常系: サーバ生成名で保存し、公開パスを返す', async () => {
    const publicPath = await storage.save('task-1', pngFile());

    expect(mkdirMock).toHaveBeenCalledWith(UPLOAD_DIR, { recursive: true });
    expect(writeFileMock).toHaveBeenCalledTimes(1);
    expect(publicPath).toMatch(/^\/uploads\/task-1-[0-9a-f-]{36}\.png$/);
    const [writtenPath] = writeFileMock.mock.calls[0];
    expect(writtenPath).toMatch(/^\/tmp\/test-uploads\/task-1-[0-9a-f-]{36}\.png$/);
  });

  it('異常系: 未対応 MIME は UnsupportedImageTypeError で書き込まない', async () => {
    const gif: ImageFile = { mimetype: 'image/gif', buffer: Buffer.from('x') };

    await expect(storage.save('task-1', gif)).rejects.toBeInstanceOf(UnsupportedImageTypeError);
    expect(writeFileMock).not.toHaveBeenCalled();
  });

  it('正常系: remove は公開パスの basename を保存先に結合して削除する', async () => {
    await storage.remove('/uploads/old-file.png');

    expect(unlinkMock).toHaveBeenCalledWith('/tmp/test-uploads/old-file.png');
  });

  it('正常系: remove(null) は unlink を呼ばない', async () => {
    await storage.remove(null);

    expect(unlinkMock).not.toHaveBeenCalled();
  });
});
