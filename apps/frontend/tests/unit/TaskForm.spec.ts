import { describe, expect, it } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import TaskForm from '~/components/TaskForm.vue';

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
    await wrapper.find('[data-testid="task-form"]').trigger('submit');

    const emitted = wrapper.emitted('submit');
    expect(emitted).toHaveLength(1);
    expect(emitted?.[0]?.[0]).toMatchObject({
      title: '買い物',
      description: '牛乳を買う',
      status: 'in_progress',
    });
  });

  it('準正常系: タイトル空はエラー表示し submit しない', async () => {
    const wrapper = await mountSuspended(TaskForm);

    await wrapper.find('[data-testid="task-form"]').trigger('submit');

    expect(wrapper.find('[data-testid="error-title"]').text()).toBe('タイトルは必須です');
    expect(wrapper.emitted('submit')).toBeUndefined();
  });

  it('準正常系: 121文字のタイトルは長さエラーで submit しない', async () => {
    const wrapper = await mountSuspended(TaskForm);

    await wrapper.find('[data-testid="task-title"]').setValue('あ'.repeat(121));
    await wrapper.find('[data-testid="task-form"]').trigger('submit');

    expect(wrapper.find('[data-testid="error-title"]').text()).toContain('120文字以内');
    expect(wrapper.emitted('submit')).toBeUndefined();
  });

  it('正常系: initial で初期値が反映される', async () => {
    const wrapper = await mountSuspended(TaskForm, {
      props: { initial: { title: '既存タスク', status: 'done' } },
    });

    const titleInput = wrapper.find<HTMLInputElement>('[data-testid="task-title"]');
    expect(titleInput.element.value).toBe('既存タスク');
  });
});
