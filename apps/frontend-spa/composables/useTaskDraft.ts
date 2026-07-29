import type { TaskDraft } from '~/utils/taskDraftSchema';

const DRAFT_KEY = 'task-draft';

/**
 * タスク新規作成の入力内容（draft）を確認画面へ引き渡す Composable。
 *
 * 保持先は **sessionStorage**（SSR 版は httpOnly Cookie）。ブラウザに閉じるため
 * サーバへ送られず、タブを閉じれば消える一方、**JS から読めるため XSS では保護されない**
 * ／**タブ単位なので別タブでは復元できない**という性質を持つ（→ docs/09 の方式差を参照）。
 *
 * 副作用（Web Storage への I/O）をここに閉じ込め、ページは表示に専念できるようにする。
 */
export function useTaskDraft() {
  /** 画像（File）は sessionStorage に置けないため、確認画面まではメモリで持ち回る。 */
  const draftImage = useState<File | null>('task-draft-image', () => null);

  const save = (draft: TaskDraft): void => {
    if (!import.meta.client) return;
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  };

  /**
   * 保存済み draft を復元する。
   * 未保存・壊れた JSON・契約外の値はすべて null を返し、呼び出し側が入力画面へ戻す。
   *
   * @returns 検証済みの入力内容。復元できない場合は null
   */
  const load = (): TaskDraft | null => {
    if (!import.meta.client) return null;
    const raw = sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    try {
      const parsed = taskDraftSchema.safeParse(JSON.parse(raw));
      return parsed.success ? parsed.data : null;
    } catch {
      // JSON として壊れている場合も draft なしとして扱う
      return null;
    }
  };

  const clear = (): void => {
    if (!import.meta.client) return;
    sessionStorage.removeItem(DRAFT_KEY);
    draftImage.value = null;
  };

  return { save, load, clear, draftImage };
}
