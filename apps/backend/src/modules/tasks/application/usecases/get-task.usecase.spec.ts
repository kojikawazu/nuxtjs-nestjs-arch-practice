import { ForbiddenException, NotFoundException } from '@nestjs/common';
import {
  OTHER,
  USER,
  buildEntity,
  createRepoMock,
  asRepo,
  type RepoMock,
} from '../../../../../test/fakes/task-fakes';
import { GetTaskUseCase } from './get-task.usecase';

describe('GetTaskUseCase', () => {
  let repo: RepoMock;
  let usecase: GetTaskUseCase;

  beforeEach(() => {
    repo = createRepoMock();
    usecase = new GetTaskUseCase(asRepo(repo));
  });

  it('正常系: 自分のタスクを取得できる', async () => {
    repo.findOne.mockResolvedValue(buildEntity());

    const result = await usecase.execute(USER, 'task-1');

    expect(result.id).toBe('task-1');
  });

  it('異常系: 存在しなければ NotFoundException', async () => {
    repo.findOne.mockResolvedValue(null);

    await expect(usecase.execute(USER, 'missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('準正常系: 他人のタスクは ForbiddenException', async () => {
    repo.findOne.mockResolvedValue(buildEntity({ userId: OTHER }));

    await expect(usecase.execute(USER, 'task-1')).rejects.toBeInstanceOf(ForbiddenException);
  });
});
