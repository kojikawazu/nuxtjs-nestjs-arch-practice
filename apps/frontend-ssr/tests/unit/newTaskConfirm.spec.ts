import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime';
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
 * SSR 確認画面の単体テスト。
 * draft は httpOnly Cookie にあり BFF 経由でしか読めないため、Nitro エンドポイントを
 * registerEndpoint でモックし、確認画面が draft を描画できることを検証する。
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
  it('正常系: BFF から取得した draft の各項目を描画する', async () => {
    registerEndpoint('/api/tasks/draft', () => ({ draft }));

    const wrapper = await mountSuspended(ConfirmPage);

    expect(wrapper.find('[data-testid="confirm-step"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="confirm-title"]').text()).toBe('牛乳を買う');
    expect(wrapper.find('[data-testid="confirm-start"]').text()).toBe('2026-06-10');
    expect(wrapper.text()).toContain('スーパーで');
    expect(wrapper.text()).toContain('未着手');
  });

  it('正常系: draft 保存時に検証済みのため、検証 OK 表示が出て作成ボタンが押せる', async () => {
    registerEndpoint('/api/tasks/draft', () => ({ draft }));

    const wrapper = await mountSuspended(ConfirmPage);

    expect(wrapper.find('[data-testid="confirm-create"]').attributes('disabled')).toBeUndefined();
  });

  it('準正常系: draft が無ければ確認内容を描画しない（入力画面へ戻す）', async () => {
    registerEndpoint('/api/tasks/draft', () => ({ draft: null }));

    const wrapper = await mountSuspended(ConfirmPage);

    expect(wrapper.find('[data-testid="confirm-step"]').exists()).toBe(false);
  });

  it('準正常系: 任意項目が未入力なら「（なし）」を表示する', async () => {
    registerEndpoint('/api/tasks/draft', () => ({
      draft: { title: '牛乳を買う', status: 'done', startDate: '2026-06-10T00:00:00.000Z' },
    }));

    const wrapper = await mountSuspended(ConfirmPage);

    expect(wrapper.find('[data-testid="confirm-title"]').text()).toBe('牛乳を買う');
    expect(wrapper.text()).toContain('（なし）');
    expect(wrapper.text()).toContain('完了');
  });

  // 部分成功（本体は作成できたが画像だけ失敗）で、再実行してもタスクが増えないこと。
  describe('作成成功後に画像アップロードが失敗した場合', () => {
    beforeEach(() => {
      useState<File | null>('task-draft-image').value = null;
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

    /** draft Cookie を返す BFF をモックし、DELETE（＝破棄）の到達回数も数える。 */
    function arrangeDraftBff(): { deleteCount: () => number } {
      let deletes = 0;
      registerEndpoint('/api/tasks/draft', (event) => {
        if (event.node.req.method === 'DELETE') {
          deletes += 1;
          return { ok: true };
        }
        return { draft };
      });
      return { deleteCount: () => deletes };
    }

    async function mountWithImage() {
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
      arrangeDraftBff();
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

    it('正常系: 作成が通った時点で draft Cookie を破棄する（リロードしても再作成できない）', async () => {
      arrangePartialFailure();
      const { deleteCount } = arrangeDraftBff();
      const wrapper = await mountWithImage();

      await createUntilPartialFailure(wrapper);

      expect(deleteCount()).toBe(1);
    });

    it('準正常系: 画像を再送しても再度失敗するが、create は 1 回しか呼ばれない', async () => {
      const { createCount } = arrangePartialFailure();
      arrangeDraftBff();
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
      arrangeDraftBff();
      const wrapper = await mountWithImage();

      await createUntilPartialFailure(wrapper);

      await wrapper.find('[data-testid="image-skip"]').trigger('click');
      await flushPromises();

      expect(createCount()).toBe(1);
    });
  });
});
