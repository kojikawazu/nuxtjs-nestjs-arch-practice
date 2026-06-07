<script setup lang="ts">
import type { TaskFormSubmit, TaskFormValue } from '~/components/TaskForm.vue';

const route = useRoute();
const id = route.params.id as string;
const { get, update, validateUpdate, uploadImage, removeImage, imageSrc } = useTasks();

const { data: task, error } = await useAsyncData(`task:${id}`, () => get(id), {
  getCachedData: () => undefined,
});

const step = ref<'form' | 'confirm'>('form');
const draft = ref<TaskFormValue | null>(null);
const imageFile = ref<File | null>(null);
const imagePreview = ref<string | null>(null);
const removeImageFlag = ref(false);
const saveError = ref<string | null>(null);
const loading = ref(false);

onUnmounted(() => {
  if (imagePreview.value) URL.revokeObjectURL(imagePreview.value);
});

// confirm 進入時のサーバ側 DryRun 検証状態
const validating = ref(false);
const validated = ref(false);
const validationError = ref<string | null>(null);

const STATUS_LABEL: Record<string, string> = {
  todo: '未着手',
  in_progress: '進行中',
  done: '完了',
};

async function onFormSubmit(payload: TaskFormSubmit) {
  const value = payload.value;
  draft.value = value;
  imageFile.value = payload.imageFile ?? null;
  removeImageFlag.value = payload.removeImage;
  // 確認画面用に新規ファイルのプレビュー URL を用意する（前回分があれば解放）
  if (imagePreview.value) URL.revokeObjectURL(imagePreview.value);
  imagePreview.value =
    payload.imageFile && typeof URL.createObjectURL === 'function'
      ? URL.createObjectURL(payload.imageFile)
      : null;
  step.value = 'confirm';
  // confirm に進んだ時点でサーバ側の検証（保存はしない・所有権も確認）を実行する
  validating.value = true;
  validated.value = false;
  validationError.value = null;
  try {
    await validateUpdate(id, {
      title: value.title,
      description: value.description,
      status: value.status,
      startDate: value.startDate,
      endDate: value.endDate,
    });
    validated.value = true;
  } catch (e) {
    validationError.value = getErrorMessage(e, '入力内容に問題があります');
  } finally {
    validating.value = false;
  }
}

async function onConfirm() {
  if (!draft.value) return;
  loading.value = true;
  saveError.value = null;
  try {
    await update(id, {
      title: draft.value.title,
      description: draft.value.description,
      status: draft.value.status,
      startDate: draft.value.startDate,
      endDate: draft.value.endDate,
    });
    // 画像の差し替え or 削除（タスク本体とは別経路）
    if (imageFile.value) {
      await uploadImage(id, imageFile.value);
    } else if (removeImageFlag.value) {
      await removeImage(id);
    }
    await navigateTo(`/tasks/${id}`);
  } catch (e) {
    saveError.value = getErrorMessage(e, '更新に失敗しました');
    loading.value = false;
  }
}
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold">タスク編集</h1>

    <p v-if="error" class="mt-6 text-red-600">タスクが見つかりませんでした</p>

    <div v-else-if="task">
      <div v-if="step === 'form'" class="mt-6">
        <TaskForm
          :initial="{
            title: task.title,
            description: task.description,
            status: task.status,
            startDate: task.startDate,
            endDate: task.endDate,
          }"
          :initial-image-src="task.imageUrl ? imageSrc(task.imageUrl) : undefined"
          submit-label="確認へ"
          @submit="onFormSubmit"
        />
      </div>

      <div v-else-if="draft" class="mt-6 space-y-4" data-testid="confirm-step">
        <h2 class="text-lg font-semibold">この内容で更新しますか？</h2>
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
            <dt class="text-gray-500">画像</dt>
            <dd>
              <img
                v-if="imagePreview"
                :src="imagePreview"
                alt="差し替える画像のプレビュー"
                data-testid="confirm-image"
                class="max-h-32 rounded border border-gray-200"
              />
              <span v-else-if="removeImageFlag" class="text-red-600">削除予定</span>
              <img
                v-else-if="task.imageUrl"
                :src="imageSrc(task.imageUrl)"
                alt="現在の画像"
                data-testid="confirm-image"
                class="max-h-32 rounded border border-gray-200"
              />
              <span v-else>（なし）</span>
            </dd>
          </div>
        </dl>
        <p v-if="validating" class="text-sm text-gray-500" data-testid="validating">
          サーバ側で検証中…
        </p>
        <p v-else-if="validated" class="text-sm text-green-700" data-testid="validation-ok">
          ✓ 検証に通りました。この内容で更新できます。
        </p>
        <p v-else-if="validationError" class="text-sm text-red-600" data-testid="validation-error">
          {{ validationError }}
        </p>
        <p v-if="saveError" class="text-sm text-red-600" data-testid="update-error">
          {{ saveError }}
        </p>
        <div class="flex gap-2">
          <button
            type="button"
            data-testid="confirm-back"
            class="rounded px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
            :disabled="loading"
            @click="step = 'form'"
          >
            修正する
          </button>
          <button
            type="button"
            data-testid="confirm-update"
            class="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            :disabled="loading || validating || !validated"
            @click="onConfirm"
          >
            更新する
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
