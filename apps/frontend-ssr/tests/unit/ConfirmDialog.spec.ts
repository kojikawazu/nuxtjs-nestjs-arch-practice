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

  it('準正常系: loading 中は OK ボタンが実際に押せない（disabled = true・confirm が飛ばない）', async () => {
    const wrapper = await mountSuspended(ConfirmDialog, { props: { loading: true } });

    // 属性の「存在」ではなく DOM の実状態を見る。
    // attributes('disabled') は値が空文字でも "false" でも存在するため、押せるかどうかを保証しない。
    const ok = wrapper.find<HTMLButtonElement>('[data-testid="confirm-ok"]');
    expect(ok.element.disabled).toBe(true);

    await ok.trigger('click');
    expect(wrapper.emitted('confirm')).toBeUndefined();
  });

  it('正常系: loading でなければ OK ボタンは押せる（disabled = false）', async () => {
    const wrapper = await mountSuspended(ConfirmDialog, { props: { loading: false } });

    expect(wrapper.find<HTMLButtonElement>('[data-testid="confirm-ok"]').element.disabled).toBe(
      false,
    );
  });

  it('正常系: title/message が描画される', async () => {
    const wrapper = await mountSuspended(ConfirmDialog, {
      props: { title: 'タスクの削除', message: '「買い物」を削除します' },
    });

    expect(wrapper.text()).toContain('タスクの削除');
    expect(wrapper.text()).toContain('「買い物」を削除します');
  });
});
