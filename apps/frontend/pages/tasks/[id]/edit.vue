<script setup lang="ts">
import type { TaskFormValue } from '~/components/TaskForm.vue';

const route = useRoute();
const id = route.params.id as string;
const { get, update } = useTasks();

const { data: task, error } = await useAsyncData(`task:${id}`, () => get(id));

const step = ref<'form' | 'confirm'>('form');
const draft = ref<TaskFormValue | null>(null);
const saveError = ref<string | null>(null);
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
  saveError.value = null;
  try {
    await update(id, {
      title: draft.value.title,
      description: draft.value.description,
      status: draft.value.status,
      dueDate: draft.value.dueDate,
    });
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
            dueDate: task.dueDate,
          }"
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
        </dl>
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
            :disabled="loading"
            @click="onConfirm"
          >
            更新する
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
