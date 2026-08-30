import { beforeEach, describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { mockNuxtImport, registerEndpoint } from '@nuxt/test-utils/runtime';
import type { Task } from '@app/api-client';
import { server } from '../setup/msw';

/**
 * 401 → リフレッシュ → 再試行の単体テスト。
 * backend への HTTP は MSW、Nitro BFF (/api/auth/*) は registerEndpoint でモックする。
 * ログイン導線への遷移は観測できるよう navigateTo をモックする。
 */
const BASE = 'http://localhost:3001';
const STALE = 'Bearer stale-token';
const FRESH = 'Bearer fresh-token';

const navigateToMock = vi.hoisted(() => vi.fn());
mockNuxtImport('navigateTo', () => navigateToMock);

const state = vi.hoisted(() => ({ refreshCalls: 0, logoutCalls: 0, refreshFails: false }));

const fakeUser = {
  id: 'u1',
  email: 'taro@example.com',
  displayName: 'Taro',
  createdAt: '2026-01-01T00:00:00.000Z',
};

const sampleTask: Task = {
  id: 't1',
  title: '買い物',
  status: 'todo',
  startDate: '2026-06-10T00:00:00.000Z',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

registerEndpoint('/api/auth/refresh', {
  method: 'POST',
  handler: () => {
    state.refreshCalls += 1;
    if (state.refreshFails) {
      throw createError({ statusCode: 401, statusMessage: 'No refresh token' });
    }
    return { accessToken: 'fresh-token', user: fakeUser };
  },
});

registerEndpoint('/api/auth/logout', {
  method: 'POST',
  handler: () => {
    state.logoutCalls += 1;
    return { ok: true };
  },
});

const unauthorized = () =>
  HttpResponse.json({ statusCode: 401, message: 'Unauthorized' }, { status: 401 });

describe('useAuthedFetch (401 → refresh → retry)', () => {
  beforeEach(() => {
    const { accessToken, user } = useAuthState();
    accessToken.value = 'stale-token';
    user.value = null;
    state.refreshCalls = 0;
    state.logoutCalls = 0;
    state.refreshFails = false;
    navigateToMock.mockClear();
  });

  it('正常系: 成功するリクエストは Authorization を付けて 1 回だけ送り、リフレッシュしない', async () => {
    const seenAuth: string[] = [];
    server.use(
      http.get(`${BASE}/tasks`, ({ request }) => {
        seenAuth.push(request.headers.get('authorization') ?? '');
        return HttpResponse.json([sampleTask]);
      }),
    );

    const { list } = useTasks();
    const tasks = await list();

    expect(tasks).toHaveLength(1);
    expect(seenAuth).toEqual([STALE]);
    expect(state.refreshCalls).toBe(0);
  });

  it('準正常系: 401 を受けたらリフレッシュし、同じボディを新トークンで再送する', async () => {
    const bodies: unknown[] = [];
    server.use(
      http.post(`${BASE}/tasks`, async ({ request }) => {
        bodies.push(await request.json());
        if (request.headers.get('authorization') !== FRESH) return unauthorized();
        return HttpResponse.json(sampleTask, { status: 201 });
      }),
    );

    const { create } = useTasks();
    const created = await create({ title: '買い物', startDate: '2026-06-10T00:00:00.000Z' });

    expect(created.id).toBe('t1');
    expect(state.refreshCalls).toBe(1);
    // 1 回目は期限切れトークンで 401、2 回目は同じボディが新トークンで再送される
    expect(bodies).toEqual([
      { title: '買い物', startDate: '2026-06-10T00:00:00.000Z' },
      { title: '買い物', startDate: '2026-06-10T00:00:00.000Z' },
    ]);
    expect(useAuthState().accessToken.value).toBe('fresh-token');
  });

  it('準正常系: 同時に 401 になった複数リクエストでもリフレッシュは 1 回だけ', async () => {
    const seenAuth: string[] = [];
    /** 古いトークンなら 401、リフレッシュ後のトークンなら本文を返す（実サーバと同じ分岐）。 */
    const respondIfFresh = (request: Request, body: Task | Task[]) => {
      seenAuth.push(request.headers.get('authorization') ?? '');
      return request.headers.get('authorization') === FRESH
        ? HttpResponse.json(body)
        : unauthorized();
    };
    server.use(
      http.get(`${BASE}/tasks`, ({ request }) => respondIfFresh(request, [sampleTask])),
      http.get(`${BASE}/tasks/t1`, ({ request }) => respondIfFresh(request, sampleTask)),
    );

    const { list, get } = useTasks();
    const [tasks, task] = await Promise.all([list(), get('t1')]);

    expect(tasks).toHaveLength(1);
    expect(task.id).toBe('t1');
    expect(state.refreshCalls).toBe(1);
    expect(seenAuth).toEqual([STALE, STALE, FRESH, FRESH]);
  });

  it('準正常系: multipart（画像アップロード）でも 401 から復帰し、ファイルを再送する', async () => {
    const sentFileNames: string[] = [];
    const withImage: Task = { ...sampleTask, imageUrl: '/uploads/t1-abc.png' };
    server.use(
      http.post(`${BASE}/tasks/t1/image`, async ({ request }) => {
        const form = await request.formData();
        sentFileNames.push((form.get('file') as File).name);
        if (request.headers.get('authorization') !== FRESH) return unauthorized();
        return HttpResponse.json(withImage, { status: 201 });
      }),
    );

    const { uploadImage } = useTasks();
    const result = await uploadImage('t1', new File(['fake'], 'pic.png', { type: 'image/png' }));

    expect(result.imageUrl).toBe('/uploads/t1-abc.png');
    expect(state.refreshCalls).toBe(1);
    // Request の body は一度しか読めないため、複製が正しく取れていないと再送でファイルが欠落する
    expect(sentFileNames).toEqual(['pic.png', 'pic.png']);
  });

  it('準正常系: 401 以外の失敗ではリフレッシュしない', async () => {
    server.use(
      http.get(`${BASE}/tasks`, () =>
        HttpResponse.json({ statusCode: 500, message: 'Internal Server Error' }, { status: 500 }),
      ),
    );

    const { list } = useTasks();
    await expect(list()).rejects.toMatchObject({ statusCode: 500 });

    expect(state.refreshCalls).toBe(0);
    expect(useAuthState().accessToken.value).toBe('stale-token');
  });

  it('異常系: リフレッシュに失敗したらセッションを破棄してログインへ戻す', async () => {
    state.refreshFails = true;
    server.use(http.get(`${BASE}/tasks`, () => unauthorized()));

    const { list } = useTasks();
    await expect(list()).rejects.toMatchObject({ statusCode: 401 });

    const { accessToken, user } = useAuthState();
    expect(accessToken.value).toBeNull();
    expect(user.value).toBeNull();
    // httpOnly Cookie は BFF 経由でしか消せないため logout を呼ぶ
    expect(state.logoutCalls).toBe(1);
    expect(navigateToMock).toHaveBeenCalledWith('/login');
  });

  it('異常系: 同時に 401 になってもセッション破棄とログイン導線は 1 回だけ走る', async () => {
    state.refreshFails = true;
    server.use(
      http.get(`${BASE}/tasks`, () => unauthorized()),
      http.get(`${BASE}/tasks/t1`, () => unauthorized()),
    );

    const { list, get } = useTasks();
    const results = await Promise.allSettled([list(), get('t1')]);

    expect(results.map((r) => r.status)).toEqual(['rejected', 'rejected']);
    // 後始末は共有した 1 本のリフレッシュに載せているので、観測者が何本でも 1 回で済む
    expect(state.refreshCalls).toBe(1);
    expect(state.logoutCalls).toBe(1);
    expect(navigateToMock).toHaveBeenCalledTimes(2);
    expect(navigateToMock).toHaveBeenCalledWith('/login');
  });

  it('異常系: 再試行しても 401 のままなら、リフレッシュを繰り返さず 401 を返す', async () => {
    let calls = 0;
    server.use(
      http.get(`${BASE}/tasks`, () => {
        calls += 1;
        return unauthorized();
      }),
    );

    const { list } = useTasks();
    await expect(list()).rejects.toMatchObject({ statusCode: 401 });

    expect(calls).toBe(2);
    expect(state.refreshCalls).toBe(1);
    // リフレッシュ自体は成功しているので、セッションは維持したまま呼び出し側へエラーを返す
    expect(useAuthState().accessToken.value).toBe('fresh-token');
    expect(navigateToMock).not.toHaveBeenCalled();
  });
});
