import {
  IMAGE_STORAGE as _IMAGE_STORAGE,
  type ImageStorage,
} from '../../src/modules/tasks/application/ports/image-storage.port';
import type { TaskRepository } from '../../src/modules/tasks/application/ports/task-repository.port';
import { Task, type TaskState } from '../../src/modules/tasks/domain/task';

/**
 * tasks UseCase 単体テスト用の共有ヘルパー（クリーンアーキテクチャ版）。
 *
 * 外部 I/O は Port（TaskRepository / ImageStorage）としてモックし、
 * 認可・日付検証などの業務ロジックはドメイン本体で検証する（モックは I/O 境界のみ）。
 */

export const USER = 'user-1';
export const OTHER = 'user-2';

// --- TaskRepository Port のモック ---

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
    // 既定では渡されたドメイン Task をそのまま返す（保存を素通し）
    update: jest.fn(async (task: Task) => task),
    deleteById: jest.fn(),
  };
}

export const asTaskRepo = (mock: TaskRepoMock): TaskRepository => mock as unknown as TaskRepository;

// --- ImageStorage Port のモック ---

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

export const IMAGE_STORAGE = _IMAGE_STORAGE;

// --- ドメイン Task のビルダー ---

export function buildState(overrides: Partial<TaskState> = {}): TaskState {
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

/** 永続化済み相当のドメイン Task を組み立てる。 */
export function buildTask(overrides: Partial<TaskState> = {}): Task {
  return Task.fromState(buildState(overrides));
}
