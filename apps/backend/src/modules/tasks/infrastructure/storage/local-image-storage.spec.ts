import { mkdir, unlink, writeFile } from 'node:fs/promises';
import type { ConfigService } from '@nestjs/config';
import { UnsupportedImageTypeError } from '../../domain/task-errors';
import { LocalImageStorage } from './local-image-storage';

// fs（外部 I/O）はモックする。MIME 判定・パストラバーサル防止などのロジックは本物で検証する。
jest.mock('node:fs/promises');
const mkdirMock = mkdir as jest.MockedFunction<typeof mkdir>;
const writeFileMock = writeFile as jest.MockedFunction<typeof writeFile>;
const unlinkMock = unlink as jest.MockedFunction<typeof unlink>;

describe('LocalImageStorage', () => {
  const UPLOAD_DIR = '/tmp/test-uploads';
  let storage: LocalImageStorage;

  beforeEach(() => {
    jest.clearAllMocks();
    mkdirMock.mockResolvedValue(undefined);
    writeFileMock.mockResolvedValue(undefined);
    unlinkMock.mockResolvedValue(undefined);
    const config = { getOrThrow: jest.fn(() => UPLOAD_DIR) } as unknown as ConfigService;
    storage = new LocalImageStorage(config);
  });

  describe('save', () => {
    it('正常系: ディレクトリ作成→書き込みの順で、サーバ生成名の公開パスを返す', async () => {
      const publicPath = await storage.save('task-1', {
        mimetype: 'image/png',
        buffer: Buffer.from('x'),
      });

      expect(mkdirMock).toHaveBeenCalledWith(UPLOAD_DIR, { recursive: true });
      expect(writeFileMock).toHaveBeenCalledTimes(1);
      // クライアント由来でなくサーバ生成の uuid 名（task-id + uuid + 拡張子）
      expect(publicPath).toMatch(/^\/uploads\/task-1-[0-9a-f-]{36}\.png$/);
      const [writtenPath] = writeFileMock.mock.calls[0];
      expect(writtenPath).toMatch(/^\/tmp\/test-uploads\/task-1-[0-9a-f-]{36}\.png$/);
    });

    it('異常系: 未対応 MIME は UnsupportedImageTypeError で書き込まない', async () => {
      await expect(
        storage.save('task-1', { mimetype: 'image/gif', buffer: Buffer.from('x') }),
      ).rejects.toBeInstanceOf(UnsupportedImageTypeError);
      expect(writeFileMock).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('正常系: 公開パスの basename のみで実体を削除する（ディレクトリ外参照不可）', async () => {
      await storage.remove('/uploads/keep.png');
      expect(unlinkMock).toHaveBeenCalledWith('/tmp/test-uploads/keep.png');
    });

    it('正常系: null のときは unlink を呼ばない', async () => {
      await storage.remove(null);
      expect(unlinkMock).not.toHaveBeenCalled();
    });

    it('準正常系: 実体が無い（unlink 失敗）でも例外を投げない', async () => {
      unlinkMock.mockRejectedValue(new Error('ENOENT'));
      await expect(storage.remove('/uploads/missing.png')).resolves.toBeUndefined();
    });
  });
});
