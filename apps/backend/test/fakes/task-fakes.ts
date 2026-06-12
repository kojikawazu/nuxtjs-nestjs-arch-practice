import { Task, type TaskDraft } from '../../src/modules/tasks/domain/task';
import type { TaskRepositoryPort } from '../../src/modules/tasks/application/ports/task-repository.port';
import type {
  ImageStoragePort,
  UploadedImage,
} from '../../src/modules/tasks/application/ports/image-storage.port';

/**
 * UseCase 単体テスト用の偽実装（ポートのインメモリ版）。
 * Repository / ストレージは「外部 I/O の境界」なので、ビジネスロジックをモックせずに
 * 偽実装へ差し替えてユースケースを検証できる（クリーンアーキテクチャの利点）。
 */

export type FakeTaskRepository = TaskRepositoryPort & {
  findManyByUser: jest.Mock;
  findById: jest.Mock;
  create: jest.Mock;
  update: jest.Mock;
  deleteById: jest.Mock;
};

const FIXED_NOW = new Date('2026-01-01T00:00:00.000Z');

export function createFakeTaskRepository(seed: Task[] = []): FakeTaskRepository {
  const store = new Map<string, Task>();
  for (const t of seed) store.set(t.id, t);
  let seq = 0;

  return {
    findManyByUser: jest.fn(async (userId: string) =>
      [...store.values()]
        .filter((t) => t.userId === userId)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
    ),
    findById: jest.fn(async (id: string) => store.get(id) ?? null),
    create: jest.fn(async (draft: TaskDraft) => {
      seq += 1;
      const task = Task.fromState({
        id: `task-${seq}`,
        userId: draft.userId,
        title: draft.title,
        description: draft.description,
        status: draft.status,
        startDate: draft.startDate,
        endDate: draft.endDate,
        url: draft.url,
        imageUrl: null,
        createdAt: FIXED_NOW,
        updatedAt: FIXED_NOW,
      });
      store.set(task.id, task);
      return task;
    }),
    update: jest.fn(async (task: Task) => {
      store.set(task.id, task);
      return task;
    }),
    deleteById: jest.fn(async (id: string) => {
      store.delete(id);
    }),
  };
}

export type FakeImageStorage = ImageStoragePort & {
  save: jest.Mock;
  remove: jest.Mock;
};

/** 既定では「保存して固定の公開パスを返す」偽ストレージ。MIME 検証は実体(LocalImageStorage)側の責務。 */
export function createFakeImageStorage(savedPath = '/uploads/task-1-fake.png'): FakeImageStorage {
  return {
    save: jest.fn(async (_taskId: string, _file: UploadedImage) => savedPath),
    remove: jest.fn(async (_publicPath: string | null) => {}),
  };
}

/** テスト用に永続化済みドメイン Task を組み立てるヘルパー。 */
export function buildTask(overrides: Partial<Parameters<typeof Task.fromState>[0]> = {}): Task {
  return Task.fromState({
    id: 'task-1',
    userId: 'user-1',
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
  });
}
