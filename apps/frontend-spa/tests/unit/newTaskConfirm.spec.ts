import { beforeEach, describe, expect, it } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import ConfirmPage from '~/pages/tasks/new/confirm.vue';

/**
 * CSR 確認画面の単体テスト。
 * draft は sessionStorage にあるため、実際に書き込んでから確認画面を描画する
 * （SSR 版は BFF 経由でしか読めないため registerEndpoint でモックしていた）。
 */
const draft = {
  title: '牛乳を買う',
  description: 'スーパーで',
  status: 'todo',
  startDate: '2026-06-10T00:00:00.000Z',
  endDate: '2026-06-20T00:00:00.000Z',
  url: 'https://example.com',
};

describe('pages/tasks/new/confirm', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('正常系: sessionStorage の draft の各項目を描画する', async () => {
    sessionStorage.setItem('task-draft', JSON.stringify(draft));

    const wrapper = await mountSuspended(ConfirmPage);

    expect(wrapper.find('[data-testid="confirm-step"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="confirm-title"]').text()).toBe('牛乳を買う');
    expect(wrapper.find('[data-testid="confirm-start"]').text()).toBe('2026-06-10');
    expect(wrapper.text()).toContain('スーパーで');
    expect(wrapper.text()).toContain('未着手');
  });

  it('正常系: 遷移前に検証済みのため、検証 OK 表示が出て作成ボタンが押せる', async () => {
    sessionStorage.setItem('task-draft', JSON.stringify(draft));

    const wrapper = await mountSuspended(ConfirmPage);

    expect(wrapper.find('[data-testid="confirm-create"]').attributes('disabled')).toBeUndefined();
  });

  it('準正常系: draft が無ければ確認内容を描画しない（入力画面へ戻す）', async () => {
    const wrapper = await mountSuspended(ConfirmPage);

    expect(wrapper.find('[data-testid="confirm-step"]').exists()).toBe(false);
  });

  it('準正常系: 任意項目が未入力なら「（なし）」を表示する', async () => {
    sessionStorage.setItem(
      'task-draft',
      JSON.stringify({
        title: '牛乳を買う',
        status: 'done',
        startDate: '2026-06-10T00:00:00.000Z',
      }),
    );

    const wrapper = await mountSuspended(ConfirmPage);

    expect(wrapper.find('[data-testid="confirm-title"]').text()).toBe('牛乳を買う');
    expect(wrapper.text()).toContain('（なし）');
    expect(wrapper.text()).toContain('完了');
  });

  it('異常系: 壊れた draft が入っていても確認内容を描画しない', async () => {
    sessionStorage.setItem('task-draft', '{壊れた');

    const wrapper = await mountSuspended(ConfirmPage);

    expect(wrapper.find('[data-testid="confirm-step"]').exists()).toBe(false);
  });
});
