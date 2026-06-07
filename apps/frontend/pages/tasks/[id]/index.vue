<script setup lang="ts">
const route = useRoute();
const id = route.params.id as string;
const { get, remove, imageSrc } = useTasks();

const { data: task, error } = await useAsyncData(`task:${id}`, () => get(id), {
  getCachedData: () => undefined,
});

const showConfirm = ref(false);
const deleting = ref(false);
const deleteError = ref<string | null>(null);

const STATUS_LABEL: Record<string, string> = {
  todo: '未着手',
  in_progress: '進行中',
  done: '完了',
};

async function onDelete() {
  deleting.value = true;
  deleteError.value = null;
  try {
    await remove(id);
    await navigateTo('/tasks');
  } catch (e) {
    deleteError.value = getErrorMessage(e, '削除に失敗しました');
    deleting.value = false;
    showConfirm.value = false;
  }
}
</script>

<template>
  <div>
    <NuxtLink to="/tasks" class="text-sm text-indigo-600">← 一覧へ</NuxtLink>

    <p v-if="error" class="mt-6 text-red-600" data-testid="detail-error">
      タスクが見つかりませんでした
    </p>

    <div v-else-if="task" class="mt-4">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold" data-testid="detail-title">{{ task.title }}</h1>
        <TaskStatusBadge :status="task.status" />
      </div>
      <img
        v-if="task.imageUrl"
        :src="imageSrc(task.imageUrl)"
        alt="タスクの添付画像"
        data-testid="detail-image"
        class="mt-4 max-h-72 rounded border border-gray-200"
      />
      <p class="mt-4 whitespace-pre-wrap text-gray-700" data-testid="detail-description">
        {{ task.description || '（説明なし）' }}
      </p>
      <p class="mt-2 text-sm text-gray-500">状態: {{ STATUS_LABEL[task.status] }}</p>
      <p class="text-sm text-gray-500" data-testid="detail-start-date">
        開始: {{ task.startDate.slice(0, 10) }}
      </p>
      <p v-if="task.endDate" class="text-sm text-gray-500" data-testid="detail-end-date">
        終了: {{ task.endDate.slice(0, 10) }}
      </p>

      <div class="mt-6 flex gap-2">
        <NuxtLink
          :to="`/tasks/${task.id}/edit`"
          data-testid="edit-link"
          class="rounded bg-gray-100 px-4 py-2 text-sm hover:bg-gray-200"
        >
          編集
        </NuxtLink>
        <button
          type="button"
          data-testid="delete-button"
          class="rounded bg-red-50 px-4 py-2 text-sm text-red-700 hover:bg-red-100"
          @click="showConfirm = true"
        >
          削除
        </button>
      </div>
      <p v-if="deleteError" class="mt-2 text-sm text-red-600">{{ deleteError }}</p>
    </div>

    <ConfirmDialog
      v-if="showConfirm"
      title="タスクの削除"
      :message="`「${task?.title}」を削除します。よろしいですか？`"
      confirm-label="削除する"
      :loading="deleting"
      @confirm="onDelete"
      @cancel="showConfirm = false"
    />
  </div>
</template>
