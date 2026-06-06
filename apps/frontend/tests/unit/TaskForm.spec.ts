import { describe, expect, it, vi } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import TaskForm from '~/components/TaskForm.vue';

// flatpickr は DOM を直接操作する外部 UI ライブラリのため、単体（happy-dom）ではスタブする。
// FlatpickrInput は素の <input> も機能するよう実装しており、setValue で値を流せる。
// 実カレンダーの挙動は Playwright E2E（実 chromium）で検証する。
vi.mock('flatpickr', () => ({
  default: () => ({ destroy: () => {}, setDate: () => {}, input: { value: '' } }),
}));

/**
 * TaskForm コンポーネントの単体テスト（Vue Test Utils）。
 * クライアント側バリデーションと submit ペイロードを具体値で検証する。
 */
describe('TaskForm', () => {
  it('正常系: 妥当な入力で submit を正しいペイロードで emit する', async () => {
    const wrapper = await mountSuspended(TaskForm);

    await wrapper.find('[data-testid="task-title"]').setValue('買い物');
    await wrapper.find('[data-testid="task-description"]').setValue('牛乳を買う');
    await wrapper.find('[data-testid="task-status"]').setValue('in_progress');
    await wrapper.find('[data-testid="task-start-date"]').setValue('2026-06-10');
    await wrapper.find('[data-testid="task-end-date"]').setValue('2026-06-15');
    await wrapper.find('[data-testid="task-form"]').trigger('submit');

    const emitted = wrapper.emitted('submit');
    expect(emitted).toHaveLength(1);
    expect(emitted?.[0]?.[0]).toMatchObject({
      title: '買い物',
      description: '牛乳を買う',
      status: 'in_progress',
      startDate: '2026-06-10T00:00:00.000Z',
      endDate: '2026-06-15T00:00:00.000Z',
    });
  });

  it('正常系: 終了は省略でき、startDate のみで submit できる', async () => {
    const wrapper = await mountSuspended(TaskForm);

    await wrapper.find('[data-testid="task-title"]').setValue('終わり未定');
    await wrapper.find('[data-testid="task-start-date"]').setValue('2026-06-10');
    await wrapper.find('[data-testid="task-form"]').trigger('submit');

    const emitted = wrapper.emitted('submit');
    expect(emitted).toHaveLength(1);
    expect(emitted?.[0]?.[0]).toMatchObject({
      startDate: '2026-06-10T00:00:00.000Z',
      endDate: undefined,
    });
  });

  it('準正常系: タイトル空はエラー表示し submit しない', async () => {
    const wrapper = await mountSuspended(TaskForm);

    await wrapper.find('[data-testid="task-start-date"]').setValue('2026-06-10');
    await wrapper.find('[data-testid="task-form"]').trigger('submit');

    expect(wrapper.find('[data-testid="error-title"]').text()).toBe('タイトルは必須です');
    expect(wrapper.emitted('submit')).toBeUndefined();
  });

  it('準正常系: 121文字のタイトルは長さエラーで submit しない', async () => {
    const wrapper = await mountSuspended(TaskForm);

    await wrapper.find('[data-testid="task-title"]').setValue('あ'.repeat(121));
    await wrapper.find('[data-testid="task-start-date"]').setValue('2026-06-10');
    await wrapper.find('[data-testid="task-form"]').trigger('submit');

    expect(wrapper.find('[data-testid="error-title"]').text()).toContain('120文字以内');
    expect(wrapper.emitted('submit')).toBeUndefined();
  });

  it('準正常系: 開始日未入力はエラー表示し submit しない', async () => {
    const wrapper = await mountSuspended(TaskForm);

    await wrapper.find('[data-testid="task-title"]').setValue('開始なし');
    await wrapper.find('[data-testid="task-form"]').trigger('submit');

    expect(wrapper.find('[data-testid="error-start-date"]').text()).toBe('開始日は必須です');
    expect(wrapper.emitted('submit')).toBeUndefined();
  });

  it('異常系: 終了が開始より前はエラー表示し submit しない', async () => {
    const wrapper = await mountSuspended(TaskForm);

    await wrapper.find('[data-testid="task-title"]').setValue('逆転');
    await wrapper.find('[data-testid="task-start-date"]').setValue('2026-06-15');
    await wrapper.find('[data-testid="task-end-date"]').setValue('2026-06-10');
    await wrapper.find('[data-testid="task-form"]').trigger('submit');

    expect(wrapper.find('[data-testid="error-end-date"]').text()).toContain('開始日以降');
    expect(wrapper.emitted('submit')).toBeUndefined();
  });

  it('正常系: initial で初期値が反映される', async () => {
    const wrapper = await mountSuspended(TaskForm, {
      props: {
        initial: { title: '既存タスク', status: 'done', startDate: '2026-06-10T00:00:00.000Z' },
      },
    });

    const titleInput = wrapper.find<HTMLInputElement>('[data-testid="task-title"]');
    expect(titleInput.element.value).toBe('既存タスク');
    const startInput = wrapper.find<HTMLInputElement>('[data-testid="task-start-date"]');
    expect(startInput.element.value).toBe('2026-06-10');
  });
});
