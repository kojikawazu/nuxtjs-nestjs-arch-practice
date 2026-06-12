import { BadRequestException } from '@nestjs/common';
import type { TaskEntity } from '../../infrastructure/task.entity';
import {
  USER,
  buildEntity,
  createRepoMock,
  asRepo,
  type RepoMock,
} from '../../../../../test/fakes/task-fakes';
import { CreateTaskUseCase } from './create-task.usecase';

describe('CreateTaskUseCase', () => {
  let repo: RepoMock;
  let usecase: CreateTaskUseCase;

  beforeEach(() => {
    repo = createRepoMock();
    usecase = new CreateTaskUseCase(asRepo(repo));
  });

  it('正常系: status 省略時は todo、description/endDate/url 省略時は null で保存する', async () => {
    repo.save.mockResolvedValue(buildEntity({ id: 'new', title: '新規', description: null }));

    const result = await usecase.execute(USER, {
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

  it('正常系: startDate/endDate(ISO) を Date に変換し、url 指定はそのまま保存する', async () => {
    repo.save.mockImplementation(async (e: TaskEntity) => buildEntity(e));

    const result = await usecase.execute(USER, {
      title: '期間あり',
      status: 'in_progress',
      startDate: '2026-03-01T00:00:00.000Z',
      endDate: '2026-03-10T00:00:00.000Z',
      url: 'https://example.com/docs',
    });

    const created = repo.create.mock.calls[0][0] as TaskEntity;
    expect(created.startDate).toEqual(new Date('2026-03-01T00:00:00.000Z'));
    expect(created.endDate).toEqual(new Date('2026-03-10T00:00:00.000Z'));
    expect(created.status).toBe('in_progress');
    expect(created.url).toBe('https://example.com/docs');
    expect(result.url).toBe('https://example.com/docs');
  });

  it('異常系: 終了が開始より前なら BadRequestException で save されない', async () => {
    await expect(
      usecase.execute(USER, {
        title: '逆転',
        startDate: '2026-03-10T00:00:00.000Z',
        endDate: '2026-03-01T00:00:00.000Z',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repo.save).not.toHaveBeenCalled();
  });
});
