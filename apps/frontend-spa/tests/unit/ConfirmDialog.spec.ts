import { describe, expect, it } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import ConfirmDialog from '~/components/ConfirmDialog.vue';

describe('ConfirmDialog', () => {
  it('正常系: OK/キャンセルで対応するイベントを emit する', async () => {
    const wrapper = await mountSuspended(ConfirmDialog, {
      props: { title: '削除', message: '本当に削除しますか？' },
    });

    await wrapper.find('[data-testid="confirm-ok"]').trigger('click');
    expect(wrapper.emitted('confirm')).toHaveLength(1);

    await wrapper.find('[data-testid="confirm-cancel"]').trigger('click');
    expect(wrapper.emitted('cancel')).toHaveLength(1);
  });

  it('準正常系: loading 中は OK ボタンが disabled になる', async () => {
    const wrapper = await mountSuspended(ConfirmDialog, { props: { loading: true } });

    expect(wrapper.find('[data-testid="confirm-ok"]').attributes('disabled')).toBeDefined();
  });

  it('正常系: title/message が描画される', async () => {
    const wrapper = await mountSuspended(ConfirmDialog, {
      props: { title: 'タスクの削除', message: '「買い物」を削除します' },
    });

    expect(wrapper.text()).toContain('タスクの削除');
    expect(wrapper.text()).toContain('「買い物」を削除します');
  });
});
