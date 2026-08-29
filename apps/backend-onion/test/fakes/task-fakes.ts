import type { Task as TaskContract } from '@app/api-client';
import type { TaskQuery } from '../../src/modules/tasks/domain/repositories/task-query';
import type { TaskRepository } from '../../src/modules/tasks/domain/repositories/task.repository';
import type { ImageStorage } from '../../src/modules/tasks/domain/services/image-storage';
import type { TaskAccessService } from '../../src/modules/tasks/domain/services/task-access.service';
import { Task, type TaskState } from '../../src/modules/tasks/domain/entities/task';
import { DateRange } from '../../src/modules/tasks/domain/value-objects/date-range';

/**
 * tasks 単体テスト用の共有ヘルパー（オニオン版）。
 *
 * 外部 I/O は契約（TaskRepository / ImageStorage）としてモックし、
 * 所有チェックはドメインサービス（TaskAccessService）として独立にモック/検証する。
 */

export const USER = 'user-1';
export const OTHER = 'user-2';

// --- TaskRepository（domain 契約）のモック ---

export type TaskRepoMock = {
  findById: jest.Mock;
  listByUserId: jest.Mock;
  create: jest.Mock;
  update: jest.Mock;
  deleteById: jest.Mock;
};

export function createTaskRepoMock(): TaskRepoMock {
  return {
    findById: jest.fn(),
    listByUserId: jest.fn(),
    create: jest.fn(),
    update: jest.fn(async (task: Task) => task),
    deleteById: jest.fn(),
  };
}

export const asTaskRepo = (mock: TaskRepoMock): TaskRepository => mock as unknown as TaskRepository;

// --- TaskQuery（読み取り専用 domain 契約 / CQRS Query 側）のモック ---

export type TaskQueryMock = {
  listByUserId: jest.Mock;
  findByIdWithOwner: jest.Mock;
};

export function createTaskQueryMock(): TaskQueryMock {
  return {
    listByUserId: jest.fn(),
    findByIdWithOwner: jest.fn(),
  };
}

export const asTaskQuery = (mock: TaskQueryMock): TaskQuery => mock as unknown as TaskQuery;

/** 契約形（API レスポンス）の Task を組み立てる（Query は契約を直接返すため）。 */
export function buildContractTask(overrides: Partial<TaskContract> = {}): TaskContract {
  return {
    id: 'task-1',
    title: '買い物',
    description: '牛乳を買う',
    status: 'todo',
    startDate: '2026-01-10T00:00:00.000Z',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
    ...overrides,
  };
}

// --- TaskAccessService（ドメインサービス）のモック ---

export type TaskAccessMock = {
  loadOwned: jest.Mock;
};

export function createTaskAccessMock(): TaskAccessMock {
  return { loadOwned: jest.fn() };
}

export const asTaskAccess = (mock: TaskAccessMock): TaskAccessService =>
  mock as unknown as TaskAccessService;

// --- ImageStorage（domain 契約）のモック ---

export type ImageStorageMock = {
  save: jest.Mock;
  remove: jest.Mock;
};

export function createImageStorageMock(): ImageStorageMock {
  return {
    save: jest.fn(),
    remove: jest.fn(async () => undefined),
  };
}

export const asImageStorage = (mock: ImageStorageMock): ImageStorage =>
  mock as unknown as ImageStorage;

// --- ドメイン Task のビルダー ---

export function buildState(overrides: Partial<TaskState> = {}): TaskState {
  return {
    id: 'task-1',
    userId: USER,
    title: '買い物',
    description: '牛乳を買う',
    status: 'todo',
    period: DateRange.of(new Date('2026-01-10T00:00:00.000Z'), null),
    url: null,
    imageUrl: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    ...overrides,
  };
}

/** 永続化済み相当のドメイン Task を組み立てる。 */
export function buildTask(overrides: Partial<TaskState> = {}): Task {
  return Task.fromState(buildState(overrides));
}
