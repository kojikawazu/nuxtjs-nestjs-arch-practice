<script setup lang="ts">
withDefaults(
  defineProps<{
    title?: string;
    message?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    loading?: boolean;
  }>(),
  {
    title: '確認',
    message: 'この操作を実行しますか？',
    confirmLabel: 'OK',
    cancelLabel: 'キャンセル',
    loading: false,
  },
);

const emit = defineEmits<{ confirm: []; cancel: [] }>();
</script>

<template>
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
    data-testid="confirm-dialog"
  >
    <div class="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
      <h2 class="text-lg font-semibold">{{ title }}</h2>
      <p class="mt-2 text-sm text-gray-600">{{ message }}</p>
      <div class="mt-6 flex justify-end gap-2">
        <button
          type="button"
          class="rounded px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
          data-testid="confirm-cancel"
          :disabled="loading"
          @click="emit('cancel')"
        >
          {{ cancelLabel }}
        </button>
        <button
          type="button"
          class="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          data-testid="confirm-ok"
          :disabled="loading"
          @click="emit('confirm')"
        >
          {{ confirmLabel }}
        </button>
      </div>
    </div>
  </div>
</template>
