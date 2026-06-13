import { ForbiddenException, NotFoundException } from '@nestjs/common';
import {
  OTHER,
  USER,
  buildEntity,
  createRepoMock,
  asRepo,
  type RepoMock,
} from '../../../../../test/fakes/task-fakes';
import { DeleteTaskUseCase } from './delete-task.usecase';

describe('DeleteTaskUseCase', () => {
  let repo: RepoMock;
  let usecase: DeleteTaskUseCase;

  beforeEach(() => {
    repo = createRepoMock();
    usecase = new DeleteTaskUseCase(asRepo(repo));
  });

  it('正常系: 所有者なら delete を呼ぶ', async () => {
    repo.findOne.mockResolvedValue(buildEntity());

    await usecase.execute(USER, 'task-1');

    expect(repo.delete).toHaveBeenCalledWith({ id: 'task-1' });
  });

  it('異常系: 存在しないタスクの削除は NotFoundException で delete されない', async () => {
    repo.findOne.mockResolvedValue(null);

    await expect(usecase.execute(USER, 'missing')).rejects.toBeInstanceOf(NotFoundException);
    expect(repo.delete).not.toHaveBeenCalled();
  });

  it('準正常系: 他人のタスク削除は ForbiddenException で delete されない', async () => {
    repo.findOne.mockResolvedValue(buildEntity({ userId: OTHER }));

    await expect(usecase.execute(USER, 'task-1')).rejects.toBeInstanceOf(ForbiddenException);
    expect(repo.delete).not.toHaveBeenCalled();
  });
});
