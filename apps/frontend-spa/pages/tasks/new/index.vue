<script setup lang="ts">
import type { TaskFormSubmit, TaskFormValue } from '~/components/TaskForm.vue';

const { validateCreate } = useTasks();
const { save, load, draftImage } = useTaskDraft();

const error = ref<string | null>(null);

// 「修正する」で戻ってきたときに入力値を復元する。
// TaskForm は props.initial を setup 時に読んで内部 ref を初期化するため、ここで同期的に解決する
// 必要がある（onMounted では初期化に間に合わない）。SPA（ssr: false）なので sessionStorage は
// setup の時点で参照できる。
const initial: Partial<TaskFormValue> | undefined = load() ?? undefined;

async function onFormSubmit(payload: TaskFormSubmit) {
  error.value = null;
  try {
    // 確認画面へ遷移する前にサーバ側 DryRun 検証（保存はしない）を済ませる。
    // これにより確認画面は「検証通過済みの内容」だけを描画すればよく、中間状態を持たない。
    await validateCreate({
      title: payload.value.title,
      description: payload.value.description,
      status: payload.value.status,
      startDate: payload.value.startDate,
      endDate: payload.value.endDate,
      url: payload.value.url,
    });
    save(payload.value);
    // 画像は sessionStorage に置けないためメモリで引き継ぐ
    draftImage.value = payload.imageFile ?? null;
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
      <TaskForm :initial="initial" submit-label="確認へ" @submit="onFormSubmit" />
    </div>
  </div>
</template>
