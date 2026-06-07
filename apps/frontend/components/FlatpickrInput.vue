<script setup lang="ts">
import flatpickr from 'flatpickr';
import type { Instance as FlatpickrInstance } from 'flatpickr/dist/types/instance';

/**
 * flatpickr でラップした日付入力。modelValue は 'YYYY-MM-DD' 文字列（未選択は ''）。
 * 副作用（DOM 操作）はクライアントのみ。素の input も機能させ、テスト容易性を保つ。
 */
const props = defineProps<{
  modelValue: string;
  testid: string;
  placeholder?: string;
}>();

const emit = defineEmits<{ 'update:modelValue': [value: string] }>();

const inputEl = ref<HTMLInputElement | null>(null);
let fp: FlatpickrInstance | null = null;

onMounted(() => {
  if (!import.meta.client || !inputEl.value) return;
  fp = flatpickr(inputEl.value, {
    dateFormat: 'Y-m-d',
    allowInput: true,
    defaultDate: props.modelValue || undefined,
    onChange: (_dates, dateStr) => emit('update:modelValue', dateStr),
  });
});

onUnmounted(() => {
  fp?.destroy();
  fp = null;
});

// 親からの変更を flatpickr 側へ反映する（リセット等）。
watch(
  () => props.modelValue,
  (value) => {
    if (!fp || value === fp.input.value) return;
    // 空文字は clear() で明示的にクリアする（setDate の型は null を受け付けない）
    if (value) fp.setDate(value, false);
    else fp.clear();
  },
);

// 素の input イベント（flatpickr 未初期化のテスト環境でも値が流れるように）。
function onInput(e: Event) {
  emit('update:modelValue', (e.target as HTMLInputElement).value);
}
</script>

<template>
  <input
    ref="inputEl"
    type="text"
    :value="modelValue"
    :data-testid="testid"
    :placeholder="placeholder ?? 'YYYY-MM-DD'"
    class="mt-1 w-full rounded border border-gray-300 px-3 py-2"
    @input="onInput"
  />
</template>
