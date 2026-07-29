import { beforeEach, describe, expect, it } from 'vitest';

/**
 * useTaskDraft の単体テスト。
 * 外部 I/O は sessionStorage（Web Storage）のみで、happy-dom の実装をそのまま使う
 * （ビジネスロジック＝検証・破棄の判断はモックしない）。
 */
const draft = {
  title: '牛乳を買う',
  description: 'スーパーで',
  status: 'todo' as const,
  startDate: '2026-06-10T00:00:00.000Z',
  endDate: '2026-06-20T00:00:00.000Z',
  url: 'https://example.com',
};

describe('useTaskDraft', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('正常系: 保存した draft をそのまま復元できる', () => {
    const { save, load } = useTaskDraft();

    save(draft);

    expect(load()).toEqual(draft);
  });

  it('正常系: 任意項目が無い draft も往復できる', () => {
    const { save, load } = useTaskDraft();
    const minimal = { title: '最小', status: 'done' as const, startDate: '2026-06-10' };

    save(minimal);

    expect(load()).toEqual(minimal);
  });

  it('正常系: clear で draft と画像の両方が破棄される', () => {
    const { save, load, clear, draftImage } = useTaskDraft();
    save(draft);
    draftImage.value = new File(['x'], 'pic.png', { type: 'image/png' });

    clear();

    expect(load()).toBeNull();
    expect(draftImage.value).toBeNull();
  });

  it('準正常系: 未保存なら null を返す', () => {
    const { load } = useTaskDraft();

    expect(load()).toBeNull();
  });

  it('異常系: JSON として壊れていれば null を返す（確認画面へ流さない）', () => {
    sessionStorage.setItem('task-draft', '{壊れた');
    const { load } = useTaskDraft();

    expect(load()).toBeNull();
  });

  it('異常系: 契約外の status に書き換えられていれば null を返す', () => {
    // sessionStorage は JS から書き換えられるため、読み出し時の検証が最後の砦になる
    sessionStorage.setItem('task-draft', JSON.stringify({ ...draft, status: 'archived' }));
    const { load } = useTaskDraft();

    expect(load()).toBeNull();
  });

  it('異常系: 必須項目が欠けていれば null を返す', () => {
    sessionStorage.setItem('task-draft', JSON.stringify({ status: 'todo' }));
    const { load } = useTaskDraft();

    expect(load()).toBeNull();
  });
});
