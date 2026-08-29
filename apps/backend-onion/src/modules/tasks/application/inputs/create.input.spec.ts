import { USER } from '../../../../../test/fakes/task-fakes';
import { toCreateTaskInput } from './create.input';

describe('toCreateTaskInput（契約 TaskCreate → CreateTaskInput）', () => {
  it('正常系: ISO 文字列の startDate を Date 化し、userId を付与して透過項目をそのまま渡す', () => {
    const input = toCreateTaskInput(USER, {
      title: '期間あり',
      description: 'メモ',
      status: 'in_progress',
      startDate: '2026-03-01T00:00:00.000Z',
      endDate: '2026-03-10T00:00:00.000Z',
      url: 'https://example.com/docs',
    });

    expect(input).toEqual({
      userId: USER,
      title: '期間あり',
      description: 'メモ',
      status: 'in_progress',
      startDate: new Date('2026-03-01T00:00:00.000Z'),
      endDate: new Date('2026-03-10T00:00:00.000Z'),
      url: 'https://example.com/docs',
    });
  });

  it('準正常系: endDate 未指定は null に正規化される（startDate のみのタスク）', () => {
    const input = toCreateTaskInput(USER, {
      title: '開始のみ',
      startDate: '2026-01-10T00:00:00.000Z',
    });

    expect(input.endDate).toBeNull();
    expect(input.startDate).toEqual(new Date('2026-01-10T00:00:00.000Z'));
  });

  it('準正常系: description/status/url 未指定は undefined のまま透過する（draft 側で既定化）', () => {
    const input = toCreateTaskInput(USER, {
      title: '最小',
      startDate: '2026-01-10T00:00:00.000Z',
    });

    expect(input.description).toBeUndefined();
    expect(input.status).toBeUndefined();
    expect(input.url).toBeUndefined();
  });
});
