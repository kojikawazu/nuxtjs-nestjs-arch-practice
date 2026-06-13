<script setup lang="ts">
import type { Task } from '@app/api-client';

defineProps<{ task: Task }>();
</script>

<template>
  <NuxtLink
    :to="`/tasks/${task.id}`"
    class="block rounded-lg border border-gray-200 bg-white p-4 hover:border-indigo-300 hover:shadow-sm"
    data-testid="task-card"
  >
    <div class="flex items-center justify-between">
      <h3 class="font-medium" data-testid="task-card-title">{{ task.title }}</h3>
      <TaskStatusBadge :status="task.status" />
    </div>
    <p v-if="task.description" class="mt-1 truncate text-sm text-gray-500">
      {{ task.description }}
    </p>
  </NuxtLink>
</template>
