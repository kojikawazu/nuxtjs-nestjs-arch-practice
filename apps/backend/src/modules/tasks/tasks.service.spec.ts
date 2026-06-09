import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { Repository } from 'typeorm';
import { TaskEntity } from './task.entity';
import { TasksService } from './tasks.service';

// fs（外部 I/O）はモックする。ビジネスロジックはモックしない方針。
jest.mock('node:fs/promises');
const mkdirMock = mkdir as jest.MockedFunction<typeof mkdir>;
const writeFileMock = writeFile as jest.MockedFunction<typeof writeFile>;
const unlinkMock = unlink as jest.MockedFunction<typeof unlink>;

/**
 * TasksService の単体テスト。
 * 外部 I/O である TypeORM Repository とファイルシステムのみモックし、
 * ユースケース/認可ロジックは本物で検証する。
 */
describe('TasksService', () => {
  const USER = 'user-1';
  const OTHER = 'user-2';
  const UPLOAD_DIR = '/tmp/test-uploads';

  let repo: {
    find: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    delete: jest.Mock;
  };
  let service: TasksService;

  const buildEntity = (overrides: Partial<TaskEntity> = {}): TaskEntity => ({
    id: 'task-1',
    userId: USER,
    title: '買い物',
    description: '牛乳を買う',
    status: 'todo',
    startDate: new Date('2026-01-10T00:00:00.000Z'),
    endDate: null,
    url: null,
    imageUrl: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    ...overrides,
  });

  const pngFile = (): Express.Multer.File =>
    ({ mimetype: 'image/png', buffer: Buffer.from('fake-png') }) as Express.Multer.File;

  beforeEach(() => {
    jest.clearAllMocks();
    mkdirMock.mockResolvedValue(undefined);
    writeFileMock.mockResolvedValue(undefined);
    unlinkMock.mockResolvedValue(undefined);
    repo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn((input) => input as TaskEntity),
      save: jest.fn(async (input: TaskEntity) => input),
      delete: jest.fn(),
    };
    const config = {
      getOrThrow: jest.fn(() => UPLOAD_DIR),
    } as unknown as ConfigService;
    service = new TasksService(repo as unknown as Repository<TaskEntity>, config);
  });

  describe('list（正常系）', () => {
    it('自分のタスクを契約 (Task) 形にマップして返す', async () => {
      repo.find.mockResolvedValue([buildEntity()]);

      const result = await service.list(USER);

      expect(repo.find).toHaveBeenCalledWith({
        where: { userId: USER },
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual([
        {
          id: 'task-1',
          title: '買い物',
          description: '牛乳を買う',
          status: 'todo',
          startDate: '2026-01-10T00:00:00.000Z',
          endDate: undefined,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-02T00:00:00.000Z',
        },
      ]);
    });
  });

  describe('create', () => {
    it('正常系: status 省略時は todo、description/endDate 省略時は null で保存する', async () => {
      repo.save.mockResolvedValue(
        buildEntity({ id: 'new', title: '新規', description: null, status: 'todo' }),
      );

      const result = await service.create(USER, {
        title: '新規',
        startDate: '2026-01-10T00:00:00.000Z',
      });

      expect(repo.create).toHaveBeenCalledWith({
        userId: USER,
        title: '新規',
        description: null,
        status: 'todo',
        startDate: new Date('2026-01-10T00:00:00.000Z'),
        endDate: null,
        url: null,
      });
      expect(result.status).toBe('todo');
      expect(result.title).toBe('新規');
    });

    it('正常系: startDate/endDate(ISO文字列) を Date に変換して保存する', async () => {
      repo.save.mockImplementation(async (e: TaskEntity) => buildEntity(e));

      await service.create(USER, {
        title: '期間あり',
        status: 'in_progress',
        startDate: '2026-03-01T00:00:00.000Z',
        endDate: '2026-03-10T00:00:00.000Z',
      });

      const created = repo.create.mock.calls[0][0] as TaskEntity;
      expect(created.startDate).toEqual(new Date('2026-03-01T00:00:00.000Z'));
      expect(created.endDate).toEqual(new Date('2026-03-10T00:00:00.000Z'));
      expect(created.status).toBe('in_progress');
    });

    it('異常系: 終了が開始より前なら BadRequestException で save されない', async () => {
      await expect(
        service.create(USER, {
          title: '逆転',
          startDate: '2026-03-10T00:00:00.000Z',
          endDate: '2026-03-01T00:00:00.000Z',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('正常系: url 指定時はそのまま保存し、契約 Task で返す', async () => {
      repo.save.mockImplementation(async (e: TaskEntity) => buildEntity(e));

      const result = await service.create(USER, {
        title: 'リンクあり',
        startDate: '2026-01-10T00:00:00.000Z',
        url: 'https://example.com/docs',
      });

      const created = repo.create.mock.calls[0][0] as TaskEntity;
      expect(created.url).toBe('https://example.com/docs');
      expect(result.url).toBe('https://example.com/docs');
    });

    it('準正常系: url 省略時は null で保存し、契約 Task では url を持たない', async () => {
      repo.save.mockImplementation(async (e: TaskEntity) => buildEntity({ ...e, url: null }));

      const result = await service.create(USER, {
        title: 'リンクなし',
        startDate: '2026-01-10T00:00:00.000Z',
      });

      const created = repo.create.mock.calls[0][0] as TaskEntity;
      expect(created.url).toBeNull();
      expect(result.url).toBeUndefined();
    });
  });

  describe('getById', () => {
    it('正常系: 自分のタスクを取得できる', async () => {
      repo.findOne.mockResolvedValue(buildEntity());

      const result = await service.getById(USER, 'task-1');

      expect(result.id).toBe('task-1');
    });

    it('異常系: 存在しなければ NotFoundException', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.getById(USER, 'missing')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('準正常系: 他人のタスクは ForbiddenException（情報を更新させない）', async () => {
      repo.findOne.mockResolvedValue(buildEntity({ userId: OTHER }));

      await expect(service.getById(USER, 'task-1')).rejects.toBeInstanceOf(ForbiddenException);
      expect(repo.save).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('正常系: 指定フィールドのみ更新する', async () => {
      repo.findOne.mockResolvedValue(buildEntity());
      repo.save.mockImplementation(async (e: TaskEntity) => e);

      const result = await service.update(USER, 'task-1', { status: 'done' });

      const saved = repo.save.mock.calls[0][0] as TaskEntity;
      expect(saved.status).toBe('done');
      expect(saved.title).toBe('買い物'); // 未指定は元のまま
      expect(result.status).toBe('done');
    });

    it('正常系: url を指定すると更新され、契約 Task に反映される', async () => {
      repo.findOne.mockResolvedValue(buildEntity());
      repo.save.mockImplementation(async (e: TaskEntity) => e);

      const result = await service.update(USER, 'task-1', { url: 'https://example.org/a' });

      const saved = repo.save.mock.calls[0][0] as TaskEntity;
      expect(saved.url).toBe('https://example.org/a');
      expect(result.url).toBe('https://example.org/a');
    });

    it('準正常系: 他人のタスク更新は ForbiddenException で save されない', async () => {
      repo.findOne.mockResolvedValue(buildEntity({ userId: OTHER }));

      await expect(service.update(USER, 'task-1', { title: 'x' })).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('異常系: 既存 startDate より前の endDate 指定は BadRequestException で save されない', async () => {
      // 既存 startDate = 2026-01-10。終了だけ 2026-01-05 に更新しようとすると逆転する
      repo.findOne.mockResolvedValue(buildEntity());

      await expect(
        service.update(USER, 'task-1', { endDate: '2026-01-05T00:00:00.000Z' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(repo.save).not.toHaveBeenCalled();
    });
  });

  describe('validateCreate（DryRun・保存しない）', () => {
    it('正常系: 検証を通り、save を呼ばない', async () => {
      await expect(
        service.validateCreate(USER, { title: '新規', startDate: '2026-01-10T00:00:00.000Z' }),
      ).resolves.toBeUndefined();

      expect(repo.save).not.toHaveBeenCalled();
      expect(repo.create).not.toHaveBeenCalled();
    });

    it('異常系: 終了が開始より前なら BadRequestException（save しない）', async () => {
      await expect(
        service.validateCreate(USER, {
          title: '逆転',
          startDate: '2026-03-10T00:00:00.000Z',
          endDate: '2026-03-01T00:00:00.000Z',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(repo.save).not.toHaveBeenCalled();
    });
  });

  describe('validateUpdate（DryRun・保存しない）', () => {
    it('正常系: 自分のタスクなら検証を通り、save を呼ばない', async () => {
      repo.findOne.mockResolvedValue(buildEntity());

      await expect(
        service.validateUpdate(USER, 'task-1', { status: 'done' }),
      ).resolves.toBeUndefined();

      expect(repo.findOne).toHaveBeenCalledWith({ where: { id: 'task-1' } });
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('異常系: 存在しないタスクは NotFoundException で save されない', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.validateUpdate(USER, 'missing', { title: 'x' })).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('準正常系: 他人のタスクは ForbiddenException で save されない', async () => {
      repo.findOne.mockResolvedValue(buildEntity({ userId: OTHER }));

      await expect(service.validateUpdate(USER, 'task-1', { title: 'x' })).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('異常系: マージ後に終了が開始より前なら BadRequestException', async () => {
      repo.findOne.mockResolvedValue(buildEntity()); // 既存 startDate = 2026-01-10

      await expect(
        service.validateUpdate(USER, 'task-1', { endDate: '2026-01-05T00:00:00.000Z' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(repo.save).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('正常系: 所有者なら delete を呼ぶ', async () => {
      repo.findOne.mockResolvedValue(buildEntity());

      await service.remove(USER, 'task-1');

      expect(repo.delete).toHaveBeenCalledWith({ id: 'task-1' });
    });

    it('異常系: 存在しないタスクの削除は NotFoundException で delete されない', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.remove(USER, 'missing')).rejects.toBeInstanceOf(NotFoundException);
      expect(repo.delete).not.toHaveBeenCalled();
    });
  });

  describe('setImage（画像添付）', () => {
    it('正常系: サーバ生成ファイル名で保存し imageUrl を設定する', async () => {
      repo.findOne.mockResolvedValue(buildEntity());
      repo.save.mockImplementation(async (e: TaskEntity) => e);

      const result = await service.setImage(USER, 'task-1', pngFile());

      // ディレクトリ作成 → 書き込みの順で外部 I/O が呼ばれる
      expect(mkdirMock).toHaveBeenCalledWith(UPLOAD_DIR, { recursive: true });
      expect(writeFileMock).toHaveBeenCalledTimes(1);
      // クライアント由来でなくサーバ生成の uuid 名（task-id + uuid + 拡張子）
      expect(result.imageUrl).toMatch(/^\/uploads\/task-1-[0-9a-f-]{36}\.png$/);
      const [writtenPath] = writeFileMock.mock.calls[0];
      expect(writtenPath).toMatch(/^\/tmp\/test-uploads\/task-1-[0-9a-f-]{36}\.png$/);
    });

    it('正常系: 既存画像があれば保存後に旧ファイルを削除する', async () => {
      repo.findOne.mockResolvedValue(buildEntity({ imageUrl: '/uploads/old-file.png' }));
      repo.save.mockImplementation(async (e: TaskEntity) => e);

      await service.setImage(USER, 'task-1', pngFile());

      expect(unlinkMock).toHaveBeenCalledWith('/tmp/test-uploads/old-file.png');
    });

    it('異常系: 未対応 MIME は BadRequestException で書き込み・保存しない', async () => {
      repo.findOne.mockResolvedValue(buildEntity());
      const gif = { mimetype: 'image/gif', buffer: Buffer.from('x') } as Express.Multer.File;

      await expect(service.setImage(USER, 'task-1', gif)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(writeFileMock).not.toHaveBeenCalled();
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('異常系: 存在しないタスクは NotFoundException で書き込みしない', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.setImage(USER, 'missing', pngFile())).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(writeFileMock).not.toHaveBeenCalled();
    });

    it('準正常系: 他人のタスクは ForbiddenException で書き込みしない', async () => {
      repo.findOne.mockResolvedValue(buildEntity({ userId: OTHER }));

      await expect(service.setImage(USER, 'task-1', pngFile())).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(writeFileMock).not.toHaveBeenCalled();
    });
  });

  describe('removeImage（画像削除）', () => {
    it('正常系: imageUrl をクリアして実ファイルを削除する', async () => {
      repo.findOne.mockResolvedValue(buildEntity({ imageUrl: '/uploads/keep.png' }));
      repo.save.mockImplementation(async (e: TaskEntity) => e);

      const result = await service.removeImage(USER, 'task-1');

      expect(result.imageUrl).toBeUndefined();
      expect(unlinkMock).toHaveBeenCalledWith('/tmp/test-uploads/keep.png');
    });

    it('正常系: 画像が無い場合は unlink を呼ばない', async () => {
      repo.findOne.mockResolvedValue(buildEntity({ imageUrl: null }));
      repo.save.mockImplementation(async (e: TaskEntity) => e);

      await service.removeImage(USER, 'task-1');

      expect(unlinkMock).not.toHaveBeenCalled();
    });

    it('準正常系: 他人のタスクは ForbiddenException で save されない', async () => {
      repo.findOne.mockResolvedValue(buildEntity({ userId: OTHER, imageUrl: '/uploads/x.png' }));

      await expect(service.removeImage(USER, 'task-1')).rejects.toBeInstanceOf(ForbiddenException);
      expect(repo.save).not.toHaveBeenCalled();
      expect(unlinkMock).not.toHaveBeenCalled();
    });
  });
});
