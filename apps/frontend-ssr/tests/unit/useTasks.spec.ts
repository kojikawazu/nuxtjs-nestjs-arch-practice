import { describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import type { Task } from '@app/api-client';
import { server } from '../setup/msw';

/**
 * useTasks の単体テスト。
 * 外部 I/O（backend への HTTP）だけを MSW でモックし、Composable のロジックを検証する。
 */
const BASE = 'http://localhost:3001';

const sampleTask: Task = {
  id: 't1',
  title: '買い物',
  description: '牛乳を買う',
  status: 'todo',
  startDate: '2026-06-10T00:00:00.000Z',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('useTasks', () => {
  it('正常系: list は GET /tasks の結果を返す', async () => {
    server.use(http.get(`${BASE}/tasks`, () => HttpResponse.json([sampleTask])));

    const { list } = useTasks();
    const tasks = await list();

    expect(tasks).toHaveLength(1);
    expect(tasks[0]?.title).toBe('買い物');
  });

  it('正常系: create はメモリのアクセストークンを Authorization に付けて POST する', async () => {
    const { accessToken } = useAuthState();
    accessToken.value = 'token-abc';

    let receivedAuth: string | null = null;
    server.use(
      http.post(`${BASE}/tasks`, ({ request }) => {
        receivedAuth = request.headers.get('authorization');
        return HttpResponse.json(sampleTask, { status: 201 });
      }),
    );

    const { create } = useTasks();
    const created = await create({ title: '買い物', startDate: '2026-06-10T00:00:00.000Z' });

    expect(created.id).toBe('t1');
    expect(receivedAuth).toBe('Bearer token-abc');
    accessToken.value = null;
  });

  it('正常系: create は url を含むボディをそのまま POST する', async () => {
    let receivedBody: { url?: string } | null = null;
    const withUrl: Task = { ...sampleTask, url: 'https://example.com/docs' };
    server.use(
      http.post(`${BASE}/tasks`, async ({ request }) => {
        receivedBody = (await request.json()) as { url?: string };
        return HttpResponse.json(withUrl, { status: 201 });
      }),
    );

    const { create } = useTasks();
    const created = await create({
      title: '買い物',
      startDate: '2026-06-10T00:00:00.000Z',
      url: 'https://example.com/docs',
    });

    expect(receivedBody!.url).toBe('https://example.com/docs');
    expect(created.url).toBe('https://example.com/docs');
  });

  it('準正常系: 検証失敗(422)は errors をフィールド別に取り出せる形で投げる', async () => {
    server.use(
      http.post(`${BASE}/tasks`, () =>
        HttpResponse.json(
          {
            statusCode: 422,
            message: 'title: 必須です, endDate: 開始以降にしてください',
            errors: [
              { field: 'title', messages: ['必須です'] },
              { field: 'endDate', messages: ['開始以降にしてください'] },
            ],
          },
          { status: 422 },
        ),
      ),
    );

    const { create } = useTasks();
    const rejected = await create({ title: '', startDate: '2026-06-10T00:00:00.000Z' }).catch(
      (e: unknown) => e,
    );

    expect(rejected).toMatchObject({ statusCode: 422 });
    expect(getFieldErrors(rejected).map((e) => e.field)).toEqual(['title', 'endDate']);
    // 人間向けの一文も従来どおり取り出せる（表示先の無い指摘の受け皿になる）
    expect(getErrorMessage(rejected, 'fallback')).toContain('title');
  });

  it('異常系: 404 のとき statusCode 付きエラーを投げる', async () => {
    server.use(
      http.get(`${BASE}/tasks/missing`, () =>
        HttpResponse.json({ statusCode: 404, message: 'Task not found' }, { status: 404 }),
      ),
    );

    const { get } = useTasks();
    await expect(get('missing')).rejects.toMatchObject({ statusCode: 404 });
  });

  it('準正常系: 削除失敗(403)はエラーを投げる', async () => {
    server.use(
      http.delete(`${BASE}/tasks/foreign`, () =>
        HttpResponse.json({ statusCode: 403, message: 'forbidden' }, { status: 403 }),
      ),
    );

    const { remove } = useTasks();
    await expect(remove('foreign')).rejects.toMatchObject({ statusCode: 403 });
  });

  it('異常系: レスポンスが契約 Task の形でない場合は 500 エラーを投げる（zod 検証）', async () => {
    // status/startDate 等の必須フィールドが欠落した壊れたレスポンス
    server.use(http.get(`${BASE}/tasks`, () => HttpResponse.json([{ id: 't1', title: 'x' }])));

    const { list } = useTasks();
    await expect(list()).rejects.toMatchObject({ statusCode: 500 });
  });

  it('異常系: 詳細で status が列挙外の壊れた値なら 500 エラーを投げる（zod 検証）', async () => {
    server.use(
      http.get(`${BASE}/tasks/bad`, () =>
        HttpResponse.json({ ...sampleTask, id: 'bad', status: 'archived' }),
      ),
    );

    const { get } = useTasks();
    await expect(get('bad')).rejects.toMatchObject({ statusCode: 500 });
  });

  describe('uploadImage / removeImage（画像）', () => {
    it('正常系: uploadImage は Bearer 付きで POST し、更新後 Task を返す', async () => {
      const { accessToken } = useAuthState();
      accessToken.value = 'token-img';

      let receivedAuth: string | null = null;
      const withImage: Task = { ...sampleTask, imageUrl: '/uploads/t1-abc.png' };
      server.use(
        http.post(`${BASE}/tasks/t1/image`, ({ request }) => {
          receivedAuth = request.headers.get('authorization');
          return HttpResponse.json(withImage, { status: 201 });
        }),
      );

      const { uploadImage } = useTasks();
      const file = new File(['fake'], 'pic.png', { type: 'image/png' });
      const result = await uploadImage('t1', file);

      expect(receivedAuth).toBe('Bearer token-img');
      expect(result.imageUrl).toBe('/uploads/t1-abc.png');
      accessToken.value = null;
    });

    it('準正常系: uploadImage が 422 のとき errors（field=file）を載せて投げる', async () => {
      server.use(
        http.post(`${BASE}/tasks/t1/image`, () =>
          HttpResponse.json(
            {
              statusCode: 422,
              message: 'Unsupported image type',
              errors: [{ field: 'file', messages: ['Unsupported image type'] }],
            },
            { status: 422 },
          ),
        ),
      );

      const { uploadImage } = useTasks();
      const file = new File(['x'], 'a.png', { type: 'image/png' });
      const rejected = await uploadImage('t1', file).catch((e: unknown) => e);

      expect(rejected).toMatchObject({ statusCode: 422 });
      expect(getFieldErrors(rejected).map((e) => e.field)).toEqual(['file']);
    });

    it('異常系: uploadImage の失敗本文が JSON でなくても statusCode 付きエラーを投げる', async () => {
      server.use(
        http.post(`${BASE}/tasks/t1/image`, () =>
          HttpResponse.text('<html>gateway error</html>', { status: 502 }),
        ),
      );

      const { uploadImage } = useTasks();
      const file = new File(['x'], 'a.png', { type: 'image/png' });
      const rejected = await uploadImage('t1', file).catch((e: unknown) => e);

      expect(rejected).toMatchObject({ statusCode: 502 });
      expect(getFieldErrors(rejected)).toEqual([]);
    });

    it('準正常系: removeImage が 403 のときエラーを投げる', async () => {
      server.use(
        http.delete(`${BASE}/tasks/foreign/image`, () =>
          HttpResponse.json({ statusCode: 403, message: 'forbidden' }, { status: 403 }),
        ),
      );

      const { removeImage } = useTasks();
      await expect(removeImage('foreign')).rejects.toMatchObject({ statusCode: 403 });
    });

    it('正常系: removeImage は DELETE し imageUrl の消えた Task を返す', async () => {
      server.use(
        http.delete(`${BASE}/tasks/t1/image`, () => HttpResponse.json(sampleTask, { status: 200 })),
      );

      const { removeImage } = useTasks();
      const result = await removeImage('t1');
      expect(result.imageUrl).toBeUndefined();
    });
  });
});
