import type { ApiError, Task, TaskCreate, TaskUpdate } from '@app/api-client';

interface FetchResult<T> {
  data?: T;
  error?: ApiError;
  response: Response;
}

/** openapi-fetch の結果を展開し、失敗時は Nuxt の createError を投げる。 */
function unwrap<T>(result: FetchResult<T>): T {
  if (result.error || !result.response.ok) {
    throw createError({
      statusCode: result.response.status,
      statusMessage: result.error?.message ?? `Request failed (${result.response.status})`,
    });
  }
  return result.data as T;
}

/**
 * タスク CRUD のユースケースを Composable に集約する。
 * 副作用（HTTP）をここに閉じ込めることで、コンポーネントは表示に専念でき、
 * テストではこの Composable を MSW でモックして検証できる。
 */
export function useTasks() {
  const client = useApiClient();

  const list = async (): Promise<Task[]> => unwrap(await client.GET('/tasks'));

  const get = async (id: string): Promise<Task> =>
    unwrap(await client.GET('/tasks/{id}', { params: { path: { id } } }));

  const create = async (body: TaskCreate): Promise<Task> =>
    unwrap(await client.POST('/tasks', { body }));

  const update = async (id: string, body: TaskUpdate): Promise<Task> =>
    unwrap(await client.PATCH('/tasks/{id}', { params: { path: { id } }, body }));

  const remove = async (id: string): Promise<void> => {
    const result = await client.DELETE('/tasks/{id}', { params: { path: { id } } });
    if (!result.response.ok) {
      throw createError({
        statusCode: result.response.status,
        statusMessage: `Failed to delete task (${result.response.status})`,
      });
    }
  };

  return { list, get, create, update, remove };
}
