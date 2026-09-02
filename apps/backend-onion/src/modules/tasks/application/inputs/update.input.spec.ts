import { USER } from '../../../../../test/fakes/task-fakes';
import { toUpdateTaskInput } from './update.input';

describe('toUpdateTaskInput（契約 TaskUpdate → UpdateTaskInput）', () => {
  it('正常系: 指定された日付のみ Date 化し、userId/id を付与する', () => {
    const input = toUpdateTaskInput(USER, 'task-1', {
      status: 'done',
      startDate: '2026-02-01T00:00:00.000Z',
    });

    expect(input.userId).toBe(USER);
    expect(input.id).toBe('task-1');
    expect(input.status).toBe('done');
    expect(input.startDate).toEqual(new Date('2026-02-01T00:00:00.000Z'));
  });

  it('準正常系: 未指定フィールドは undefined のまま保持する（部分更新の意味を壊さない）', () => {
    const input = toUpdateTaskInput(USER, 'task-1', { title: 'タイトルだけ' });

    expect(input.title).toBe('タイトルだけ');
    expect(input.description).toBeUndefined();
    expect(input.status).toBeUndefined();
    expect(input.startDate).toBeUndefined();
    expect(input.endDate).toBeUndefined();
    expect(input.url).toBeUndefined();
  });

  // null（削除指定）と undefined（未指定）を潰すと、利用者が任意項目を消せなくなる
  it('正常系: null（削除指定）は null のまま通す', () => {
    const input = toUpdateTaskInput(USER, 'task-1', {
      description: null,
      endDate: null,
      url: null,
    });

    expect(input.description).toBeNull();
    expect(input.endDate).toBeNull();
    expect(input.url).toBeNull();
  });

  it('準正常系: 同じボディで null と undefined が混在しても取り違えない', () => {
    const input = toUpdateTaskInput(USER, 'task-1', { description: null, title: 'タイトル' });

    expect(input.description).toBeNull();
    expect(input.url).toBeUndefined();
    expect(input.endDate).toBeUndefined();
  });
  it('準正常系: endDate を指定すれば Date 化され、未指定なら undefined（null 化しない）', () => {
    const withEnd = toUpdateTaskInput(USER, 'task-1', { endDate: '2026-03-10T00:00:00.000Z' });
    expect(withEnd.endDate).toEqual(new Date('2026-03-10T00:00:00.000Z'));

    const withoutEnd = toUpdateTaskInput(USER, 'task-1', { title: 'x' });
    expect(withoutEnd.endDate).toBeUndefined();
  });
});
