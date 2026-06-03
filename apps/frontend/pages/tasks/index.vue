<script setup lang="ts">
const { list } = useTasks();
const { data: tasks, pending, error } = await useAsyncData('tasks', () => list());
</script>

<template>
  <div>
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold">タスク一覧</h1>
      <NuxtLink
        to="/tasks/new"
        data-testid="new-task-link"
        class="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
      >
        新規作成
      </NuxtLink>
    </div>

    <p v-if="pending" class="mt-6 text-gray-500">読み込み中...</p>
    <p v-else-if="error" class="mt-6 text-red-600" data-testid="tasks-error">
      タスクの取得に失敗しました
    </p>
    <p
      v-else-if="!tasks || tasks.length === 0"
      class="mt-6 text-gray-500"
      data-testid="tasks-empty"
    >
      タスクがありません。新規作成しましょう。
    </p>
    <ul v-else class="mt-6 space-y-3" data-testid="task-list">
      <li v-for="task in tasks" :key="task.id">
        <TaskCard :task="task" />
      </li>
    </ul>
  </div>
</template>
