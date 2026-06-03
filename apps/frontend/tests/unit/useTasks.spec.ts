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
    const created = await create({ title: '買い物' });

    expect(created.id).toBe('t1');
    expect(receivedAuth).toBe('Bearer token-abc');
    accessToken.value = null;
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
});
