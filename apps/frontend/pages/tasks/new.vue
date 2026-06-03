<script setup lang="ts">
import type { TaskFormValue } from '~/components/TaskForm.vue';

const { create } = useTasks();

const step = ref<'form' | 'confirm'>('form');
const draft = ref<TaskFormValue | null>(null);
const error = ref<string | null>(null);
const loading = ref(false);

const STATUS_LABEL: Record<string, string> = {
  todo: '未着手',
  in_progress: '進行中',
  done: '完了',
};

function onFormSubmit(value: TaskFormValue) {
  draft.value = value;
  step.value = 'confirm';
}

async function onConfirm() {
  if (!draft.value) return;
  loading.value = true;
  error.value = null;
  try {
    const created = await create({
      title: draft.value.title,
      description: draft.value.description,
      status: draft.value.status,
      dueDate: draft.value.dueDate,
    });
    await navigateTo(`/tasks/${created.id}`);
  } catch (e) {
    error.value = getErrorMessage(e, 'タスクの作成に失敗しました');
    loading.value = false;
  }
}
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold">タスク新規作成</h1>

    <div v-if="step === 'form'" class="mt-6">
      <TaskForm submit-label="確認へ" @submit="onFormSubmit" />
    </div>

    <div v-else-if="draft" class="mt-6 space-y-4" data-testid="confirm-step">
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
          <dt class="text-gray-500">期限</dt>
          <dd>{{ draft.dueDate ? draft.dueDate.slice(0, 10) : '（なし）' }}</dd>
        </div>
      </dl>
      <p v-if="error" class="text-sm text-red-600" data-testid="create-error">{{ error }}</p>
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
