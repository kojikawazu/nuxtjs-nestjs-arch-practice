import type { ApiError, Task, TaskCreate, TaskUpdate } from '@app/api-client';
import { taskListSchema, taskSchema } from '~/utils/taskSchema';

interface FetchResult<T> {
  data?: T;
  error?: ApiError;
  response: Response;
}

/**
 * openapi-fetch の結果を展開し、失敗時は Nuxt の createError を投げる。
 * 検証失敗（422）の `errors` は data に載せて運ぶ（フォームがフィールド別に表示するため）。
 */
function unwrap<T>(result: FetchResult<T>): T {
  if (result.error || !result.response.ok) {
    throw createError({
      statusCode: result.response.status,
      statusMessage: result.error?.message ?? `Request failed (${result.response.status})`,
      data: { errors: result.error?.errors },
    });
  }
  return result.data as T;
}

/**
 * backend のレスポンスを契約 `Task` として**ランタイム検証**する（zod）。
 * 型はコンパイル時の保証にすぎないため、想定外の形（欠落・型崩れ）を境界で検出し、
 * 不正なら 500 相当のエラーを投げて壊れたデータを画面に流さない。
 */
function parseTask(data: unknown): Task {
  const result = taskSchema.safeParse(data);
  if (!result.success) {
    throw createError({ statusCode: 500, statusMessage: 'サーバ応答の形式が不正です' });
  }
  return result.data;
}

function parseTaskList(data: unknown): Task[] {
  const result = taskListSchema.safeParse(data);
  if (!result.success) {
    throw createError({ statusCode: 500, statusMessage: 'サーバ応答の形式が不正です' });
  }
  return result.data;
}

/**
 * タスク CRUD のユースケースを Composable に集約する。
 * 副作用（HTTP）をここに閉じ込めることで、コンポーネントは表示に専念でき、
 * テストではこの Composable を MSW でモックして検証できる。
 */
export function useTasks() {
  const client = useApiClient();
  const config = useRuntimeConfig();
  // 画像経路は openapi-fetch を通らないが、Authorization 注入と 401 時の
  // リフレッシュ再試行は同じにしたいので、同じ fetch ラッパを共有する。
  const authedFetch = useAuthedFetch();

  /** 添付画像の公開パス（"/uploads/..."）を表示可能な絶対 URL に変換する。 */
  const imageSrc = (imageUrl: string): string => `${config.public.apiBaseUrl}${imageUrl}`;

  /**
   * 失敗レスポンスの本文を契約 `ApiError` として読む。
   * 画像経路は openapi-fetch を通らないため、エラー本文が自動で展開されない。
   * 本文が JSON でない場合（プロキシの HTML エラー等）もありうるので握りつぶして undefined を返す。
   */
  const readApiError = async (res: Response): Promise<ApiError | undefined> => {
    try {
      return (await res.json()) as ApiError;
    } catch {
      return undefined;
    }
  };

  /** 画像アップロード（multipart）。openapi-fetch は multipart に不向きなためここだけ Request を組む。 */
  const uploadImage = async (id: string, file: File): Promise<Task> => {
    const form = new FormData();
    form.append('file', file);
    const res = await authedFetch(
      new Request(`${config.public.apiBaseUrl}/tasks/${id}/image`, {
        method: 'POST',
        body: form,
      }),
    );
    if (!res.ok) {
      const apiError = await readApiError(res);
      throw createError({
        statusCode: res.status,
        statusMessage: apiError?.message ?? `画像のアップロードに失敗しました (${res.status})`,
        data: { errors: apiError?.errors },
      });
    }
    return (await res.json()) as Task;
  };

  const removeImage = async (id: string): Promise<Task> => {
    const res = await authedFetch(
      new Request(`${config.public.apiBaseUrl}/tasks/${id}/image`, { method: 'DELETE' }),
    );
    if (!res.ok) {
      throw createError({
        statusCode: res.status,
        statusMessage: `画像の削除に失敗しました (${res.status})`,
      });
    }
    return (await res.json()) as Task;
  };

  const list = async (): Promise<Task[]> => parseTaskList(unwrap(await client.GET('/tasks')));

  const get = async (id: string): Promise<Task> =>
    parseTask(unwrap(await client.GET('/tasks/{id}', { params: { path: { id } } })));

  const create = async (body: TaskCreate): Promise<Task> =>
    parseTask(unwrap(await client.POST('/tasks', { body })));

  const update = async (id: string, body: TaskUpdate): Promise<Task> =>
    parseTask(unwrap(await client.PATCH('/tasks/{id}', { params: { path: { id } }, body })));

  const remove = async (id: string): Promise<void> => {
    const result = await client.DELETE('/tasks/{id}', { params: { path: { id } } });
    if (!result.response.ok) {
      throw createError({
        statusCode: result.response.status,
        statusMessage: `Failed to delete task (${result.response.status})`,
      });
    }
  };

  return {
    list,
    get,
    create,
    update,
    remove,
    uploadImage,
    removeImage,
    imageSrc,
  };
}
