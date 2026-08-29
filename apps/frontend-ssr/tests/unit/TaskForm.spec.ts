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
    const payload = emitted?.[0]?.[0] as { value: unknown; imageFile?: File; removeImage: boolean };
    expect(payload.value).toMatchObject({
      title: '買い物',
      description: '牛乳を買う',
      status: 'in_progress',
      startDate: '2026-06-10T00:00:00.000Z',
      endDate: '2026-06-15T00:00:00.000Z',
    });
    // 画像未選択なので imageFile は無く、削除要求もない
    expect(payload.imageFile).toBeUndefined();
    expect(payload.removeImage).toBe(false);
  });

  it('正常系: 終了は省略でき、startDate のみで submit できる', async () => {
    const wrapper = await mountSuspended(TaskForm);

    await wrapper.find('[data-testid="task-title"]').setValue('終わり未定');
    await wrapper.find('[data-testid="task-start-date"]').setValue('2026-06-10');
    await wrapper.find('[data-testid="task-form"]').trigger('submit');

    const emitted = wrapper.emitted('submit');
    expect(emitted).toHaveLength(1);
    expect((emitted?.[0]?.[0] as { value: unknown }).value).toMatchObject({
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

  it('正常系: 画像を選択すると submit ペイロードに imageFile が含まれる', async () => {
    const wrapper = await mountSuspended(TaskForm);

    await wrapper.find('[data-testid="task-title"]').setValue('画像つき');
    await wrapper.find('[data-testid="task-start-date"]').setValue('2026-06-10');

    const png = new File(['fake'], 'pic.png', { type: 'image/png' });
    const input = wrapper.find('[data-testid="task-image-input"]');
    Object.defineProperty(input.element, 'files', { value: [png], configurable: true });
    await input.trigger('change');

    await wrapper.find('[data-testid="task-form"]').trigger('submit');

    const payload = wrapper.emitted('submit')?.[0]?.[0] as { imageFile?: File };
    expect(payload.imageFile).toBeInstanceOf(File);
    expect(payload.imageFile?.name).toBe('pic.png');
  });

  it('準正常系: 非対応MIMEはエラー表示し submit しない', async () => {
    const wrapper = await mountSuspended(TaskForm);

    await wrapper.find('[data-testid="task-title"]').setValue('不正画像');
    await wrapper.find('[data-testid="task-start-date"]').setValue('2026-06-10');

    const txt = new File(['x'], 'a.txt', { type: 'text/plain' });
    const input = wrapper.find('[data-testid="task-image-input"]');
    Object.defineProperty(input.element, 'files', { value: [txt], configurable: true });
    await input.trigger('change');

    expect(wrapper.find('[data-testid="error-image"]').text()).toContain('PNG');

    await wrapper.find('[data-testid="task-form"]').trigger('submit');
    expect(wrapper.emitted('submit')).toBeUndefined();
  });

  it('正常系: http/https の URL は submit ペイロードに含まれる', async () => {
    const wrapper = await mountSuspended(TaskForm);

    await wrapper.find('[data-testid="task-title"]').setValue('リンク付き');
    await wrapper.find('[data-testid="task-start-date"]').setValue('2026-06-10');
    await wrapper.find('[data-testid="task-url"]').setValue('https://example.com/docs');
    await wrapper.find('[data-testid="task-form"]').trigger('submit');

    const payload = wrapper.emitted('submit')?.[0]?.[0] as { value: { url?: string } };
    expect(payload.value.url).toBe('https://example.com/docs');
  });

  it('異常系: javascript: スキームはエラー表示し submit しない', async () => {
    const wrapper = await mountSuspended(TaskForm);

    await wrapper.find('[data-testid="task-title"]').setValue('XSS試行');
    await wrapper.find('[data-testid="task-start-date"]').setValue('2026-06-10');
    await wrapper.find('[data-testid="task-url"]').setValue('javascript:alert(1)');
    await wrapper.find('[data-testid="task-form"]').trigger('submit');

    expect(wrapper.find('[data-testid="error-url"]').text()).toContain('http');
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

  // serverErrors: backend の 422（ApiError.errors）を、クライアント検証と同じ位置に出す。
  it('準正常系: serverErrors を対応するフィールドのエラー欄へ表示する', async () => {
    const wrapper = await mountSuspended(TaskForm, {
      props: {
        serverErrors: [
          { field: 'title', messages: ['タイトルを入力してください'] },
          { field: 'endDate', messages: ['endDate must be on or after startDate'] },
        ],
      },
    });

    expect(wrapper.find('[data-testid="error-title"]').text()).toBe('タイトルを入力してください');
    expect(wrapper.find('[data-testid="error-end-date"]').text()).toBe(
      'endDate must be on or after startDate',
    );
    expect(wrapper.find('[data-testid="error-url"]').exists()).toBe(false);
  });

  it('準正常系: 画像の検証失敗（field=file）は画像欄へ割り付ける', async () => {
    const wrapper = await mountSuspended(TaskForm, {
      props: {
        serverErrors: [{ field: 'file', messages: ['PNG / JPEG / WebP のみ添付できます'] }],
      },
    });

    expect(wrapper.find('[data-testid="error-image"]').text()).toBe(
      'PNG / JPEG / WebP のみ添付できます',
    );
  });

  it('準正常系: フォームに表示先が無いフィールドは無視し、他の指摘は表示する', async () => {
    const wrapper = await mountSuspended(TaskForm, {
      props: {
        serverErrors: [
          { field: '_', messages: ['リクエストボディが不正です'] },
          { field: 'status', messages: ['不正な状態です'] },
          { field: 'title', messages: ['タイトルを入力してください'] },
        ],
      },
    });

    // 表示先の無い指摘はページ側が message を全文表示するため、ここでは落とすだけでよい
    expect(wrapper.find('[data-testid="error-title"]').text()).toBe('タイトルを入力してください');
    expect(wrapper.find('[data-testid="error-start-date"]').exists()).toBe(false);
  });

  it('正常系: 入力を直して再 submit すると、サーバ由来のエラー表示は消える', async () => {
    const wrapper = await mountSuspended(TaskForm, {
      props: { serverErrors: [{ field: 'title', messages: ['タイトルを入力してください'] }] },
    });
    expect(wrapper.find('[data-testid="error-title"]').exists()).toBe(true);

    await wrapper.find('[data-testid="task-title"]').setValue('直したタイトル');
    await wrapper.find('[data-testid="task-start-date"]').setValue('2026-06-10');
    await wrapper.find('[data-testid="task-form"]').trigger('submit');

    expect(wrapper.find('[data-testid="error-title"]').exists()).toBe(false);
    expect(wrapper.emitted('submit')).toHaveLength(1);
  });

  // payloadByteLimit: SSR 版の新規作成は入力内容を Cookie で確認画面へ運ぶため、
  // 文字数とは別に直列化サイズの上限がある（未指定の画面では検証しない）。
  it('準正常系: 上限指定時、サイズ超過を入力中に表示し submit させない', async () => {
    const wrapper = await mountSuspended(TaskForm, { props: { payloadByteLimit: 3500 } });

    await wrapper.find('[data-testid="task-title"]').setValue('大きいタスク');
    await wrapper.find('[data-testid="task-start-date"]').setValue('2026-06-10');
    // 日本語 1000 文字は文字数上限 2000 以内だが、エンコード後は 9000 バイト相当になる
    await wrapper.find('[data-testid="task-description"]').setValue('あ'.repeat(1000));

    // submit を待たずエラーが出ている
    expect(wrapper.find('[data-testid="error-payload-size"]').exists()).toBe(true);

    await wrapper.find('[data-testid="task-form"]').trigger('submit');
    expect(wrapper.emitted('submit')).toBeUndefined();
  });

  it('正常系: 上限指定時でも、収まる入力ならエラーを出さず submit できる', async () => {
    const wrapper = await mountSuspended(TaskForm, { props: { payloadByteLimit: 3500 } });

    await wrapper.find('[data-testid="task-title"]').setValue('小さいタスク');
    await wrapper.find('[data-testid="task-start-date"]').setValue('2026-06-10');
    await wrapper.find('[data-testid="task-description"]').setValue('あ'.repeat(100));
    await wrapper.find('[data-testid="task-form"]').trigger('submit');

    expect(wrapper.find('[data-testid="error-payload-size"]').exists()).toBe(false);
    expect(wrapper.emitted('submit')).toHaveLength(1);
  });

  it('準正常系: 上限未指定なら、同じ入力でもサイズ検証は行わない', async () => {
    const wrapper = await mountSuspended(TaskForm);

    await wrapper.find('[data-testid="task-title"]').setValue('大きいタスク');
    await wrapper.find('[data-testid="task-start-date"]').setValue('2026-06-10');
    await wrapper.find('[data-testid="task-description"]').setValue('あ'.repeat(1000));
    await wrapper.find('[data-testid="task-form"]').trigger('submit');

    expect(wrapper.find('[data-testid="error-payload-size"]').exists()).toBe(false);
    expect(wrapper.emitted('submit')).toHaveLength(1);
  });
});
