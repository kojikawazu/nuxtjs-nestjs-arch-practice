<script setup lang="ts">
import type { ValidationError } from '@app/api-client';
import type { TaskFormSubmit, TaskFormValue } from '~/components/TaskForm.vue';

const error = ref<string | null>(null);

// 画像（File）は Cookie にも JSON にも載せられないため、確認画面まではクライアント側で保持する。
// SSR で描画されるのはテキスト項目のみで、画像プレビューは確認画面で <ClientOnly> として出す。
const draftImage = useState<File | null>('task-draft-image', () => null);

/**
 * サーバの検証失敗（422）を確認画面から差し戻すための保持先。
 * 確認画面は別ルートなので遷移をまたぐ必要があるが、draft 本体と違い Cookie には載せない
 * （サーバ描画に要らないうえ、永続化すると直したあとも古いエラーが復活してしまうため）。
 */
const draftErrors = useState<ValidationError[]>('task-draft-errors', () => []);

/**
 * 「修正する」で戻ってきた場合に入力値を復元するため、保存済み draft を読み出す。
 * draft は httpOnly Cookie にあるので BFF 経由で取得し、SSR 実行時は元リクエストの
 * Cookie を引き継ぐ useRequestFetch を使う（$fetch ではヘッダが転送されず取得できない）。
 */
const { data } = await useAsyncData('task-draft-form', () =>
  useRequestFetch()<{ draft: TaskFormValue | null }>('/api/tasks/draft'),
);

const initial = computed<Partial<TaskFormValue> | undefined>(() => data.value?.draft ?? undefined);

async function onFormSubmit(payload: TaskFormSubmit) {
  error.value = null;
  // 送り直しなので、前回サーバに弾かれた内容は一度捨てる
  draftErrors.value = [];
  draftImage.value = payload.imageFile ?? null;
  try {
    // draft の保存（httpOnly Cookie）を BFF に委ねる。確認画面はこの Cookie をサーバ描画で読む。
    await $fetch('/api/tasks/draft', {
      method: 'POST',
      body: payload.value,
    });
    await navigateTo('/tasks/new/confirm');
  } catch (e) {
    error.value = getErrorMessage(e, '入力内容に問題があります');
  }
}
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold">タスク新規作成</h1>

    <div class="mt-6">
      <p v-if="error" class="mb-3 text-sm text-red-600" data-testid="draft-error">{{ error }}</p>
      <!-- 入力内容は Cookie で確認画面へ運ぶため、Cookie 上限を入力中から知らせる -->
      <TaskForm
        :initial="initial"
        :payload-byte-limit="MAX_DRAFT_BYTES"
        :server-errors="draftErrors"
        submit-label="確認へ"
        @submit="onFormSubmit"
      />
    </div>
  </div>
</template>
