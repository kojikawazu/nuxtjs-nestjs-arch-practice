<script setup lang="ts">
import type { TaskStatus } from '@app/api-client';

export interface TaskFormValue {
  title: string;
  description?: string;
  status: TaskStatus;
  startDate: string;
  endDate?: string;
  url?: string;
}

/** TaskForm が送出する確定内容。画像はタスク本体とは別経路でアップロードする。 */
export interface TaskFormSubmit {
  value: TaskFormValue;
  /** 新たに添付する画像（未選択なら undefined） */
  imageFile?: File;
  /** 既存画像の削除を要求するか */
  removeImage: boolean;
}

const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

const props = withDefaults(
  defineProps<{
    initial?: Partial<TaskFormValue>;
    /** 既存の添付画像の表示用 URL（編集時のプレビュー） */
    initialImageSrc?: string;
    submitLabel?: string;
  }>(),
  { submitLabel: '確認へ' },
);

const emit = defineEmits<{ submit: [payload: TaskFormSubmit] }>();

const title = ref(props.initial?.title ?? '');
const description = ref(props.initial?.description ?? '');
const status = ref<TaskStatus>(props.initial?.status ?? 'todo');
const startDate = ref(props.initial?.startDate ? props.initial.startDate.slice(0, 10) : '');
const endDate = ref(props.initial?.endDate ? props.initial.endDate.slice(0, 10) : '');
const url = ref(props.initial?.url ?? '');

// 画像状態: 新規選択ファイル / プレビュー URL / 既存削除フラグ
const imageFile = ref<File | null>(null);
const objectUrl = ref<string | null>(null);
const removeExisting = ref(false);

const previewSrc = computed<string | null>(() => {
  if (objectUrl.value) return objectUrl.value;
  if (!removeExisting.value && props.initialImageSrc) return props.initialImageSrc;
  return null;
});

const errors = reactive<{
  title?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  url?: string;
  image?: string;
}>({});

function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0] ?? null;
  errors.image = undefined;
  if (file) {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      errors.image = 'PNG / JPEG / WebP のみ添付できます';
      imageFile.value = null;
      objectUrl.value = null;
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      errors.image = '画像は2MB以内にしてください';
      imageFile.value = null;
      objectUrl.value = null;
      return;
    }
    removeExisting.value = false;
  }
  imageFile.value = file;
  objectUrl.value =
    file && typeof URL.createObjectURL === 'function' ? URL.createObjectURL(file) : null;
}

function onRemoveImage() {
  removeExisting.value = true;
  imageFile.value = null;
  objectUrl.value = null;
  errors.image = undefined;
}

function validate(): boolean {
  errors.title = undefined;
  errors.description = undefined;
  errors.startDate = undefined;
  errors.endDate = undefined;
  errors.url = undefined;

  // 入力規則は zod スキーマ（taskFormSchema）に集約し、ここでは結果をフィールド別エラーに割り付ける。
  const result = taskFormSchema.safeParse({
    title: title.value,
    description: description.value,
    startDate: startDate.value,
    endDate: endDate.value,
    url: url.value,
  });
  if (!result.success) {
    for (const issue of result.error.issues) {
      const field = issue.path[0] as keyof typeof errors;
      // フィールドごとに最初の 1 件だけ表示する（従来の単一メッセージ挙動を維持）。
      if (field && errors[field] === undefined) {
        errors[field] = issue.message;
      }
    }
  }
  // 画像（File 実体）の検証は onFileChange 側で errors.image に入る。
  return result.success && !errors.image;
}

function onSubmit() {
  if (!validate()) return;
  emit('submit', {
    value: {
      title: title.value.trim(),
      description: description.value.trim() === '' ? undefined : description.value.trim(),
      status: status.value,
      startDate: new Date(startDate.value).toISOString(),
      endDate: endDate.value === '' ? undefined : new Date(endDate.value).toISOString(),
      url: url.value.trim() === '' ? undefined : url.value.trim(),
    },
    imageFile: imageFile.value ?? undefined,
    removeImage: removeExisting.value,
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
      <label class="block text-sm font-medium text-gray-700">関連 URL（任意・http/https）</label>
      <input
        v-model="url"
        type="url"
        inputmode="url"
        placeholder="https://example.com"
        data-testid="task-url"
        class="mt-1 w-full rounded border border-gray-300 px-3 py-2"
      />
      <p v-if="errors.url" class="mt-1 text-sm text-red-600" data-testid="error-url">
        {{ errors.url }}
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

    <div>
      <label class="block text-sm font-medium text-gray-700"
        >画像（任意・PNG/JPEG/WebP・2MBまで）</label
      >
      <input
        type="file"
        accept="image/png,image/jpeg,image/webp"
        data-testid="task-image-input"
        class="mt-1 block w-full text-sm"
        @change="onFileChange"
      />
      <p v-if="errors.image" class="mt-1 text-sm text-red-600" data-testid="error-image">
        {{ errors.image }}
      </p>
      <div v-if="previewSrc" class="mt-2">
        <img
          :src="previewSrc"
          alt="添付画像のプレビュー"
          data-testid="task-image-preview"
          class="max-h-40 rounded border border-gray-200"
        />
        <button
          type="button"
          data-testid="task-image-remove"
          class="mt-1 block text-sm text-red-600 hover:underline"
          @click="onRemoveImage"
        >
          画像を削除
        </button>
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
