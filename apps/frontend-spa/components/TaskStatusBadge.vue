<script setup lang="ts">
import type { TaskStatus } from '@app/api-client';

const props = defineProps<{ status: TaskStatus }>();

const STYLES: Record<TaskStatus, { label: string; class: string }> = {
  todo: { label: '未着手', class: 'bg-gray-100 text-gray-700' },
  in_progress: { label: '進行中', class: 'bg-blue-100 text-blue-700' },
  done: { label: '完了', class: 'bg-green-100 text-green-700' },
};

const style = computed(() => STYLES[props.status]);
</script>

<template>
  <span
    class="inline-block rounded-full px-2 py-0.5 text-xs font-medium"
    :class="style.class"
    data-testid="status-badge"
  >
    {{ style.label }}
  </span>
</template>
