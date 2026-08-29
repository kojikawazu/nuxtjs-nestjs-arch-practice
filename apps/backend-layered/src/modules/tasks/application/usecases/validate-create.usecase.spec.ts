import { BadRequestException } from '@nestjs/common';
import { USER, createRepoMock, type RepoMock } from '../../../../../test/fakes/task-fakes';
import { ValidateCreateTaskUseCase } from './validate-create.usecase';

describe('ValidateCreateTaskUseCase（DryRun・保存しない）', () => {
  let repo: RepoMock;
  let usecase: ValidateCreateTaskUseCase;

  beforeEach(() => {
    repo = createRepoMock();
    usecase = new ValidateCreateTaskUseCase();
  });

  it('正常系: 有効な入力なら例外を投げず、Repository に触れない', () => {
    expect(() =>
      usecase.execute(USER, { title: '新規', startDate: '2026-01-10T00:00:00.000Z' }),
    ).not.toThrow();
    expect(repo.create).not.toHaveBeenCalled();
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('異常系: 終了が開始より前なら BadRequestException', () => {
    expect(() =>
      usecase.execute(USER, {
        title: '逆転',
        startDate: '2026-03-10T00:00:00.000Z',
        endDate: '2026-03-01T00:00:00.000Z',
      }),
    ).toThrow(BadRequestException);
  });
});
