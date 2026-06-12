import { Task, TaskDraft } from './task';
import { InvalidDateRangeError, TaskAccessDeniedError } from './task-errors';

/**
 * ドメイン単体テスト（モック 0）。フレームワーク非依存の業務ルールを純粋に検証する。
 */
describe('TaskDraft', () => {
  const base = {
    userId: 'user-1',
    title: '新規',
    description: null,
    status: null,
    startDate: new Date('2026-03-01T00:00:00.000Z'),
    endDate: null,
    url: null,
  };

  describe('create（正常系）', () => {
    it('status 未指定なら既定の todo になる', () => {
      const draft = TaskDraft.create({ ...base });
      expect(draft.status).toBe('todo');
    });

    it('status 指定はそのまま保持する', () => {
      const draft = TaskDraft.create({ ...base, status: 'in_progress' });
      expect(draft.status).toBe('in_progress');
    });
  });

  describe('create（異常系）', () => {
    it('終了が開始より前なら InvalidDateRangeError', () => {
      expect(() =>
        TaskDraft.create({
          ...base,
          startDate: new Date('2026-03-10T00:00:00.000Z'),
          endDate: new Date('2026-03-01T00:00:00.000Z'),
        }),
      ).toThrow(InvalidDateRangeError);
    });
  });
});

describe('Task', () => {
  const build = (overrides: Partial<Parameters<typeof Task.fromState>[0]> = {}): Task =>
    Task.fromState({
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

  describe('assertOwnedBy', () => {
    it('正常系: 所有者なら例外を投げない', () => {
      expect(() => build().assertOwnedBy('user-1')).not.toThrow();
    });

    it('準正常系: 他人なら TaskAccessDeniedError', () => {
      expect(() => build().assertOwnedBy('user-2')).toThrow(TaskAccessDeniedError);
    });
  });

  describe('applyUpdate', () => {
    it('正常系: 指定フィールドのみ反映し、未指定は元のまま', () => {
      const task = build();
      task.applyUpdate({ status: 'done' });
      expect(task.status).toBe('done');
      expect(task.title).toBe('買い物');
    });

    it('正常系: description に undefined を含めない部分更新（url のみ）', () => {
      const task = build();
      task.applyUpdate({ url: 'https://example.org/a' });
      expect(task.url).toBe('https://example.org/a');
      expect(task.description).toBe('牛乳を買う');
    });

    it('異常系: 既存 startDate より前の endDate 反映は InvalidDateRangeError', () => {
      const task = build(); // startDate = 2026-01-10
      expect(() => task.applyUpdate({ endDate: new Date('2026-01-05T00:00:00.000Z') })).toThrow(
        InvalidDateRangeError,
      );
    });
  });

  describe('assertUpdatable（DryRun・状態を変えない）', () => {
    it('正常系: 問題なければ例外を投げず、状態も変わらない', () => {
      const task = build();
      expect(() => task.assertUpdatable({ status: 'done' })).not.toThrow();
      expect(task.status).toBe('todo'); // 変わっていない
    });

    it('異常系: マージ後に終了が開始より前なら InvalidDateRangeError', () => {
      const task = build(); // startDate = 2026-01-10
      expect(() => task.assertUpdatable({ endDate: new Date('2026-01-05T00:00:00.000Z') })).toThrow(
        InvalidDateRangeError,
      );
    });
  });

  describe('attachImage / detachImage', () => {
    it('正常系: attachImage で公開パスが設定される', () => {
      const task = build();
      task.attachImage('/uploads/x.png');
      expect(task.imageUrl).toBe('/uploads/x.png');
    });

    it('正常系: detachImage で null になる', () => {
      const task = build({ imageUrl: '/uploads/x.png' });
      task.detachImage();
      expect(task.imageUrl).toBeNull();
    });
  });
});
