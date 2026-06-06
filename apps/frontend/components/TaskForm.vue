<script setup lang="ts">
import type { TaskStatus } from '@app/api-client';

export interface TaskFormValue {
  title: string;
  description?: string;
  status: TaskStatus;
  startDate: string;
  endDate?: string;
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
const startDate = ref(props.initial?.startDate ? props.initial.startDate.slice(0, 10) : '');
const endDate = ref(props.initial?.endDate ? props.initial.endDate.slice(0, 10) : '');

const errors = reactive<{
  title?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
}>({});

function validate(): boolean {
  errors.title = undefined;
  errors.description = undefined;
  errors.startDate = undefined;
  errors.endDate = undefined;
  const trimmed = title.value.trim();
  if (trimmed.length === 0) {
    errors.title = 'タイトルは必須です';
  } else if (trimmed.length > 120) {
    errors.title = 'タイトルは120文字以内で入力してください';
  }
  if (description.value.length > 2000) {
    errors.description = '説明は2000文字以内で入力してください';
  }
  if (startDate.value === '') {
    errors.startDate = '開始日は必須です';
  } else if (endDate.value !== '' && endDate.value < startDate.value) {
    errors.endDate = '終了日は開始日以降にしてください';
  }
  return !errors.title && !errors.description && !errors.startDate && !errors.endDate;
}

function onSubmit() {
  if (!validate()) return;
  emit('submit', {
    title: title.value.trim(),
    description: description.value.trim() === '' ? undefined : description.value.trim(),
    status: status.value,
    startDate: new Date(startDate.value).toISOString(),
    endDate: endDate.value === '' ? undefined : new Date(endDate.value).toISOString(),
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

    <div>
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

    <div class="flex gap-4">
      <div class="flex-1">
        <label class="block text-sm font-medium text-gray-700">開始</label>
        <FlatpickrInput v-model="startDate" testid="task-start-date" />
        <p v-if="errors.startDate" class="mt-1 text-sm text-red-600" data-testid="error-start-date">
          {{ errors.startDate }}
        </p>
      </div>
      <div class="flex-1">
        <label class="block text-sm font-medium text-gray-700">終了（任意）</label>
        <FlatpickrInput v-model="endDate" testid="task-end-date" />
        <p v-if="errors.endDate" class="mt-1 text-sm text-red-600" data-testid="error-end-date">
          {{ errors.endDate }}
        </p>
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
