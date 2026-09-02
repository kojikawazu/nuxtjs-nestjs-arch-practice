<script setup lang="ts">
import type { Task } from '@app/api-client';

const { create, uploadImage } = useTasks();
const { load, clear, draftImage, draftErrors } = useTaskDraft();

const error = ref<string | null>(null);
const loading = ref(false);
const imagePreview = ref<string | null>(null);

/**
 * 作成に成功したタスクの id。null 以外＝「本体は作成済み」で、この画面には
 * 画像の再送／断念だけが残る（＝再作成の経路が無い）状態を表す。
 */
const createdTaskId = ref<string | null>(null);

/** draft 破棄後も添付を再試行できるよう、画像の実体を手元に退避しておく。 */
const pendingImage = ref<File | null>(null);

const STATUS_LABEL: Record<string, string> = {
  todo: '未着手',
  in_progress: '進行中',
  done: '完了',
};

// draft は sessionStorage から同期的に復元する。SSR 版と違い初回 HTML には含まれず、
// ハイドレーション後にクライアントが描画する（→ docs/09 の方式差）。
const draft = load();

// draft が無い状態（直リンク・別タブ・作成後）で確認画面を見せても意味がないため入力画面へ戻す。
// sessionStorage はタブ単位なので、Cookie 方式と違い「別タブで開く」だけでこの経路に入る。
if (!draft) {
  await navigateTo('/tasks/new', { replace: true });
}

onMounted(() => {
  if (draftImage.value && typeof URL.createObjectURL === 'function') {
    imagePreview.value = URL.createObjectURL(draftImage.value);
  }
});

onUnmounted(() => {
  if (imagePreview.value) URL.revokeObjectURL(imagePreview.value);
});

/**
 * タスク本体を作成し、続けて画像を添付する。
 *
 * 本体は POST（冪等でない）なので、**作成が通った時点で draft を破棄する**。
 * draft は「もう一度作成する」ための唯一の燃料であり、これを消すと画像の添付が失敗しても、
 * この画面をリロードしても、二重作成が起こりえない（画面も再作成ボタンを出さなくなる）。
 */
async function onConfirm() {
  // loading 中の再入も弾く（:disabled の反映は次ティックなので、素早い 2 回押しはここまで届く）
  if (!draft || loading.value || createdTaskId.value) return;
  loading.value = true;
  error.value = null;

  let created: Task;
  try {
    created = await create({
      title: draft.title,
      // 作成には「消す」対象が無いため、空欄（null）はキーごと省略する（契約 TaskCreate は nullable でない）
      description: draft.description ?? undefined,
      status: draft.status,
      startDate: draft.startDate,
      endDate: draft.endDate ?? undefined,
      url: draft.url ?? undefined,
    });
  } catch (e) {
    error.value = getErrorMessage(e, 'タスクの作成に失敗しました');
    const fieldErrors = getFieldErrors(e);
    if (fieldErrors.length > 0) {
      // この画面には入力欄が無いため、フィールド別に直せる入力画面へ差し戻す
      draftErrors.value = fieldErrors;
      await navigateTo('/tasks/new');
      return;
    }
    loading.value = false;
    return;
  }

  // 画像は draft ごと消える前に手元へ退避する（添付は作成後の別 API のため）
  pendingImage.value = draftImage.value;
  clear();
  createdTaskId.value = created.id;

  await onAttachImage();
}

/**
 * 作成済みタスクへ画像を添付し、詳細へ移る（画像が無ければそのまま移る）。
 * 失敗してもこの画面に留まるだけで、本体は作成済みのまま何度でも押し直せる。
 */
async function onAttachImage() {
  const id = createdTaskId.value;
  if (!id) return;
  loading.value = true;
  error.value = null;
  try {
    if (pendingImage.value) {
      await uploadImage(id, pendingImage.value);
    }
    await navigateTo(`/tasks/${id}`);
  } catch (e) {
    error.value = getErrorMessage(e, '画像の添付に失敗しました');
    loading.value = false;
  }
}

/** 画像の添付を諦めて、作成済みタスクの詳細へ移る。 */
async function onSkipImage() {
  const id = createdTaskId.value;
  if (!id) return;
  pendingImage.value = null;
  await navigateTo(`/tasks/${id}`);
}
</script>

<template>
  <div v-if="draft">
    <h1 class="text-2xl font-bold">タスク新規作成</h1>

    <div class="mt-6 space-y-4" data-testid="confirm-step">
      <h2 class="text-lg font-semibold">この内容で作成しますか？</h2>
      <dl class="rounded-lg border border-gray-200 bg-white p-4 text-sm">
        <div class="flex justify-between py-1">
          <dt class="text-gray-500">タイトル</dt>
          <dd data-testid="confirm-title">{{ draft.title }}</dd>
        </div>
        <div class="flex justify-between py-1">
          <dt class="text-gray-500">説明</dt>
          <dd>{{ draft.description ?? '（なし）' }}</dd>
        </div>
        <div class="flex justify-between py-1">
          <dt class="text-gray-500">状態</dt>
          <dd>{{ STATUS_LABEL[draft.status] }}</dd>
        </div>
        <div class="flex justify-between py-1">
          <dt class="text-gray-500">開始</dt>
          <dd data-testid="confirm-start">{{ draft.startDate.slice(0, 10) }}</dd>
        </div>
        <div class="flex justify-between py-1">
          <dt class="text-gray-500">終了</dt>
          <dd>{{ draft.endDate ? draft.endDate.slice(0, 10) : '（なし）' }}</dd>
        </div>
        <div class="flex items-start justify-between py-1">
          <dt class="text-gray-500">関連 URL</dt>
          <dd class="ml-4 min-w-0 max-w-[60%]">
            <UrlPreview :url="draft.url" />
          </dd>
        </div>
        <div class="flex items-start justify-between py-1">
          <dt class="text-gray-500">画像</dt>
          <dd>
            <img
              v-if="imagePreview"
              :src="imagePreview"
              alt="添付画像のプレビュー"
              data-testid="confirm-image"
              class="max-h-32 rounded border border-gray-200"
            />
            <span v-else>（なし）</span>
          </dd>
        </div>
      </dl>

      <!--
        部分成功（本体は作成済み・画像だけ失敗）では「作成する」を出さない。
        再作成の経路そのものを画面から消すことで、押し直しによる重複を防ぐ。
      -->
      <div v-if="createdTaskId" class="space-y-3" data-testid="partial-success">
        <p class="text-sm text-red-600" data-testid="partial-error">
          タスクは作成されました。画像の添付だけ失敗しました（{{ error }}）
        </p>
        <div class="flex gap-2">
          <button
            type="button"
            data-testid="image-skip"
            class="rounded px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 disabled:opacity-50"
            :disabled="loading"
            @click="onSkipImage"
          >
            画像なしで完了する
          </button>
          <button
            type="button"
            data-testid="image-retry"
            class="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            :disabled="loading"
            @click="onAttachImage"
          >
            画像を再送する
          </button>
        </div>
      </div>

      <template v-else>
        <p v-if="error" class="text-sm text-red-600" data-testid="create-error">{{ error }}</p>

        <div class="flex gap-2">
          <NuxtLink
            to="/tasks/new"
            data-testid="confirm-back"
            class="rounded px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
          >
            修正する
          </NuxtLink>
          <button
            type="button"
            data-testid="confirm-create"
            class="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            :disabled="loading"
            @click="onConfirm"
          >
            作成する
          </button>
        </div>
      </template>
    </div>
  </div>
</template>
