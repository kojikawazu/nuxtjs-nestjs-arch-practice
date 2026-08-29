<script setup lang="ts">
const { create, uploadImage } = useTasks();
const { load, clear, draftImage } = useTaskDraft();

const error = ref<string | null>(null);
const loading = ref(false);
const imagePreview = ref<string | null>(null);

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

async function onConfirm() {
  if (!draft) return;
  loading.value = true;
  error.value = null;
  try {
    const created = await create({
      title: draft.title,
      description: draft.description,
      status: draft.status,
      startDate: draft.startDate,
      endDate: draft.endDate,
      url: draft.url,
    });
    // 画像は作成後に別経路でアップロードする（任意・1枚）
    if (draftImage.value) {
      await uploadImage(created.id, draftImage.value);
    }
    // 作成が完了したら入力内容を残さない
    clear();
    await navigateTo(`/tasks/${created.id}`);
  } catch (e) {
    error.value = getErrorMessage(e, 'タスクの作成に失敗しました');
    loading.value = false;
  }
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
    </div>
  </div>
</template>
