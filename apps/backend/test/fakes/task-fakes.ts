import type { Repository } from 'typeorm';
import { TaskEntity } from '../../src/modules/tasks/infrastructure/task.entity';

/**
 * tasks UseCase 単体テスト用の共有ヘルパー。
 * 外部 I/O である TypeORM Repository のみモックし、認可・日付検証などのロジックは本物で検証する。
 */

export type RepoMock = {
  find: jest.Mock;
  findOne: jest.Mock;
  create: jest.Mock;
  save: jest.Mock;
  delete: jest.Mock;
};

export function createRepoMock(): RepoMock {
  return {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn((input) => input as TaskEntity),
    save: jest.fn(async (input: TaskEntity) => input),
    delete: jest.fn(),
  };
}

/** RepoMock を UseCase コンストラクタへ渡すための型合わせ。 */
export const asRepo = (mock: RepoMock): Repository<TaskEntity> =>
  mock as unknown as Repository<TaskEntity>;

export const USER = 'user-1';
export const OTHER = 'user-2';

export function buildEntity(overrides: Partial<TaskEntity> = {}): TaskEntity {
  return {
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
  };
}
