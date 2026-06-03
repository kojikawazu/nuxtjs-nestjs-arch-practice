import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { TaskEntity } from './task.entity';
import { TasksService } from './tasks.service';

/**
 * TasksService の単体テスト。
 * 外部 I/O である TypeORM Repository のみモックし、ユースケース/認可ロジックは本物で検証する。
 */
describe('TasksService', () => {
  const USER = 'user-1';
  const OTHER = 'user-2';

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
    dueDate: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    ...overrides,
  });

  beforeEach(() => {
    repo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn((input) => input as TaskEntity),
      save: jest.fn(async (input: TaskEntity) => input),
      delete: jest.fn(),
    };
    service = new TasksService(repo as unknown as Repository<TaskEntity>);
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
          dueDate: undefined,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-02T00:00:00.000Z',
        },
      ]);
    });
  });

  describe('create（正常系）', () => {
    it('status 省略時は todo、description/dueDate 省略時は null で保存する', async () => {
      repo.save.mockResolvedValue(
        buildEntity({ id: 'new', title: '新規', description: null, status: 'todo' }),
      );

      const result = await service.create(USER, { title: '新規' });

      expect(repo.create).toHaveBeenCalledWith({
        userId: USER,
        title: '新規',
        description: null,
        status: 'todo',
        dueDate: null,
      });
      expect(result.status).toBe('todo');
      expect(result.title).toBe('新規');
    });

    it('dueDate(ISO文字列) を Date に変換して保存する', async () => {
      repo.save.mockImplementation(async (e: TaskEntity) => buildEntity(e));

      await service.create(USER, {
        title: '締切あり',
        status: 'in_progress',
        dueDate: '2026-03-01T09:00:00.000Z',
      });

      const created = repo.create.mock.calls[0][0] as TaskEntity;
      expect(created.dueDate).toEqual(new Date('2026-03-01T09:00:00.000Z'));
      expect(created.status).toBe('in_progress');
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

    it('準正常系: 他人のタスク更新は ForbiddenException で save されない', async () => {
      repo.findOne.mockResolvedValue(buildEntity({ userId: OTHER }));

      await expect(service.update(USER, 'task-1', { title: 'x' })).rejects.toBeInstanceOf(
        ForbiddenException,
      );
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
});
