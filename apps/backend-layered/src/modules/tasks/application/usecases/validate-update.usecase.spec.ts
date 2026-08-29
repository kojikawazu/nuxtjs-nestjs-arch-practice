import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import {
  OTHER,
  USER,
  buildEntity,
  createRepoMock,
  asRepo,
  type RepoMock,
} from '../../../../../test/fakes/task-fakes';
import { ValidateUpdateTaskUseCase } from './validate-update.usecase';

describe('ValidateUpdateTaskUseCase（DryRun・保存しない）', () => {
  let repo: RepoMock;
  let usecase: ValidateUpdateTaskUseCase;

  beforeEach(() => {
    repo = createRepoMock();
    usecase = new ValidateUpdateTaskUseCase(asRepo(repo));
  });

  it('正常系: 自分のタスクなら検証を通り、save を呼ばない', async () => {
    repo.findOne.mockResolvedValue(buildEntity());

    await expect(usecase.execute(USER, 'task-1', { status: 'done' })).resolves.toBeUndefined();

    expect(repo.findOne).toHaveBeenCalledWith({ where: { id: 'task-1' } });
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('異常系: 存在しないタスクは NotFoundException で save されない', async () => {
    repo.findOne.mockResolvedValue(null);

    await expect(usecase.execute(USER, 'missing', { title: 'x' })).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('準正常系: 他人のタスクは ForbiddenException で save されない', async () => {
    repo.findOne.mockResolvedValue(buildEntity({ userId: OTHER }));

    await expect(usecase.execute(USER, 'task-1', { title: 'x' })).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('異常系: マージ後に終了が開始より前なら BadRequestException', async () => {
    repo.findOne.mockResolvedValue(buildEntity()); // 既存 startDate = 2026-01-10

    await expect(
      usecase.execute(USER, 'task-1', { endDate: '2026-01-05T00:00:00.000Z' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repo.save).not.toHaveBeenCalled();
  });
});
