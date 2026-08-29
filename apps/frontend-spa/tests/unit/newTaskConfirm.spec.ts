import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { flushPromises } from '@vue/test-utils';
import { http, HttpResponse } from 'msw';
import { server } from '../setup/msw';
import ConfirmPage from '~/pages/tasks/new/confirm.vue';

const BASE = 'http://localhost:3001';

/**
 * 条件が満たされるまでイベントループを回す。
 * MSW / $fetch は実 I/O なので、flushPromises 1 回では非同期の鎖（作成 → draft 破棄 → 画像添付）が
 * 最後まで進まない。何回で終わるかは版によって違うため、回数ではなく到達状態で待つ。
 */
async function flushUntil(predicate: () => boolean, ticks = 30): Promise<void> {
  for (let i = 0; i < ticks; i += 1) {
    if (predicate()) return;
    await flushPromises();
  }
}

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
    useState<File | null>('task-draft-image').value = null;
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

  // 部分成功（本体は作成できたが画像だけ失敗）で、再実行してもタスクが増えないこと。
  describe('作成成功後に画像アップロードが失敗した場合', () => {
    beforeEach(() => {
      // happy-dom の URL.createObjectURL は Node の File を Blob と認めず throw するため、
      // プレビュー生成だけスタブする（ここで確かめたいのは再試行の安全性で、画像表示ではない）。
      vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:preview-stub');
      vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    /** POST /tasks の呼び出し回数を数えつつ、画像アップロードは失敗させる。 */
    function arrangePartialFailure(): { createCount: () => number } {
      let creates = 0;
      server.use(
        http.post(`${BASE}/tasks`, () => {
          creates += 1;
          return HttpResponse.json(
            {
              id: 'created-1',
              title: '牛乳を買う',
              status: 'todo',
              startDate: '2026-06-10T00:00:00.000Z',
              createdAt: '2026-01-01T00:00:00.000Z',
              updatedAt: '2026-01-01T00:00:00.000Z',
            },
            { status: 201 },
          );
        }),
        http.post(`${BASE}/tasks/created-1/image`, () =>
          HttpResponse.json({ statusCode: 500, message: 'upload failed' }, { status: 500 }),
        ),
      );
      return { createCount: () => creates };
    }

    async function mountWithImage() {
      sessionStorage.setItem('task-draft', JSON.stringify(draft));
      useState<File | null>('task-draft-image').value = new File(['x'], 'a.png', {
        type: 'image/png',
      });
      return mountSuspended(ConfirmPage);
    }

    /** 作成 → 画像失敗までを進め、部分成功の表示が出た状態にする。 */
    async function createUntilPartialFailure(wrapper: Awaited<ReturnType<typeof mountWithImage>>) {
      await wrapper.find('[data-testid="confirm-create"]').trigger('click');
      await flushUntil(() => wrapper.find('[data-testid="partial-success"]').exists());
    }

    it('準正常系: 本体は作成済みと伝え、再作成ボタンを消して画像の再送だけを残す', async () => {
      arrangePartialFailure();
      const wrapper = await mountWithImage();

      await createUntilPartialFailure(wrapper);

      expect(wrapper.find('[data-testid="partial-error"]').text()).toContain(
        'タスクは作成されました',
      );
      // 再作成の経路そのものが画面から消えている
      expect(wrapper.find('[data-testid="confirm-create"]').exists()).toBe(false);
      expect(wrapper.find('[data-testid="image-retry"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="image-skip"]').exists()).toBe(true);
    });

    it('正常系: 作成が通った時点で draft を破棄する（リロードしても再作成できない）', async () => {
      arrangePartialFailure();
      const wrapper = await mountWithImage();

      await createUntilPartialFailure(wrapper);

      expect(sessionStorage.getItem('task-draft')).toBeNull();
    });

    it('準正常系: 画像を再送しても再度失敗するが、create は 1 回しか呼ばれない', async () => {
      const { createCount } = arrangePartialFailure();
      const wrapper = await mountWithImage();

      await createUntilPartialFailure(wrapper);
      expect(createCount()).toBe(1);

      await wrapper.find('[data-testid="image-retry"]').trigger('click');
      await flushUntil(
        () => wrapper.find('[data-testid="image-retry"]').attributes('disabled') === undefined,
      );
      await wrapper.find('[data-testid="image-retry"]').trigger('click');
      await flushUntil(
        () => wrapper.find('[data-testid="image-retry"]').attributes('disabled') === undefined,
      );

      expect(createCount()).toBe(1);
      expect(wrapper.find('[data-testid="partial-success"]').exists()).toBe(true);
    });

    it('正常系: 画像を諦めて完了しても、create は 1 回のまま', async () => {
      const { createCount } = arrangePartialFailure();
      const wrapper = await mountWithImage();

      await createUntilPartialFailure(wrapper);

      await wrapper.find('[data-testid="image-skip"]').trigger('click');
      await flushPromises();

      expect(createCount()).toBe(1);
    });
  });
});
