import { BadRequestException, ForbiddenException } from '@nestjs/common';
import type { TaskEntity } from '../../infrastructure/task.entity';
import {
  OTHER,
  USER,
  buildEntity,
  createRepoMock,
  asRepo,
  type RepoMock,
} from '../../../../../test/fakes/task-fakes';
import { UpdateTaskUseCase } from './update-task.usecase';

describe('UpdateTaskUseCase', () => {
  let repo: RepoMock;
  let usecase: UpdateTaskUseCase;

  beforeEach(() => {
    repo = createRepoMock();
    usecase = new UpdateTaskUseCase(asRepo(repo));
  });

  it('正常系: 指定フィールドのみ更新する（未指定は元のまま）', async () => {
    repo.findOne.mockResolvedValue(buildEntity());
    repo.save.mockImplementation(async (e: TaskEntity) => e);

    const result = await usecase.execute(USER, 'task-1', { status: 'done' });

    const saved = repo.save.mock.calls[0][0] as TaskEntity;
    expect(saved.status).toBe('done');
    expect(saved.title).toBe('買い物');
    expect(result.status).toBe('done');
  });

  it('正常系: url を指定すると更新され、契約 Task に反映される', async () => {
    repo.findOne.mockResolvedValue(buildEntity());
    repo.save.mockImplementation(async (e: TaskEntity) => e);

    const result = await usecase.execute(USER, 'task-1', { url: 'https://example.org/a' });

    expect(result.url).toBe('https://example.org/a');
  });

  it('準正常系: 他人のタスク更新は ForbiddenException で save されない', async () => {
    repo.findOne.mockResolvedValue(buildEntity({ userId: OTHER }));

    await expect(usecase.execute(USER, 'task-1', { title: 'x' })).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('異常系: 既存 startDate より前の endDate 指定は BadRequestException で save されない', async () => {
    repo.findOne.mockResolvedValue(buildEntity()); // 既存 startDate = 2026-01-10

    await expect(
      usecase.execute(USER, 'task-1', { endDate: '2026-01-05T00:00:00.000Z' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repo.save).not.toHaveBeenCalled();
  });
});
