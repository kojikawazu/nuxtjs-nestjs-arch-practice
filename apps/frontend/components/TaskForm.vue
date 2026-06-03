<script setup lang="ts">
import type { TaskStatus } from '@app/api-client';

export interface TaskFormValue {
  title: string;
  description?: string;
  status: TaskStatus;
  dueDate?: string;
}

const props = withDefaults(
  defineProps<{
    initial?: Partial<TaskFormValue>;
    submitLabel?: string;
  }>(),
  { submitLabel: '確認へ' },
);

const emit = defineEmits<{ submit: [value: TaskFormValue] }>();

const title = ref(props.initial?.title ?? '');
const description = ref(props.initial?.description ?? '');
const status = ref<TaskStatus>(props.initial?.status ?? 'todo');
const dueDate = ref(props.initial?.dueDate ? props.initial.dueDate.slice(0, 10) : '');

const errors = reactive<{ title?: string; description?: string }>({});

function validate(): boolean {
  errors.title = undefined;
  errors.description = undefined;
  const trimmed = title.value.trim();
  if (trimmed.length === 0) {
    errors.title = 'タイトルは必須です';
  } else if (trimmed.length > 120) {
    errors.title = 'タイトルは120文字以内で入力してください';
  }
  if (description.value.length > 2000) {
    errors.description = '説明は2000文字以内で入力してください';
  }
  return !errors.title && !errors.description;
}

function onSubmit() {
  if (!validate()) return;
  emit('submit', {
    title: title.value.trim(),
    description: description.value.trim() === '' ? undefined : description.value.trim(),
    status: status.value,
    dueDate: dueDate.value === '' ? undefined : new Date(dueDate.value).toISOString(),
  });
}
</script>

<template>
  <form class="space-y-4" data-testid="task-form" @submit.prevent="onSubmit">
    <div>
      <label class="block text-sm font-medium text-gray-700">タイトル</label>
      <input
        v-model="title"
        type="text"
        data-testid="task-title"
        class="mt-1 w-full rounded border border-gray-300 px-3 py-2"
      />
      <p v-if="errors.title" class="mt-1 text-sm text-red-600" data-testid="error-title">
        {{ errors.title }}
      </p>
    </div>

    <div>
      <label class="block text-sm font-medium text-gray-700">説明</label>
      <textarea
        v-model="description"
        rows="3"
        data-testid="task-description"
        class="mt-1 w-full rounded border border-gray-300 px-3 py-2"
      />
      <p
        v-if="errors.description"
        class="mt-1 text-sm text-red-600"
        data-testid="error-description"
      >
        {{ errors.description }}
      </p>
    </div>

    <div class="flex gap-4">
      <div class="flex-1">
        <label class="block text-sm font-medium text-gray-700">状態</label>
        <select
          v-model="status"
          data-testid="task-status"
          class="mt-1 w-full rounded border border-gray-300 px-3 py-2"
        >
          <option value="todo">未着手</option>
          <option value="in_progress">進行中</option>
          <option value="done">完了</option>
        </select>
      </div>
      <div class="flex-1">
        <label class="block text-sm font-medium text-gray-700">期限</label>
        <input
          v-model="dueDate"
          type="date"
          data-testid="task-due-date"
          class="mt-1 w-full rounded border border-gray-300 px-3 py-2"
        />
      </div>
    </div>

    <button
      type="submit"
      data-testid="task-submit"
      class="rounded bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700"
    >
      {{ submitLabel }}
    </button>
  </form>
</template>
