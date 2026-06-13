<script setup lang="ts">
const { isAuthenticated, user, logout } = useAuth();

async function onLogout() {
  await logout();
  await navigateTo('/login');
}
</script>

<template>
  <header class="border-b border-gray-200 bg-white">
    <div class="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
      <NuxtLink to="/tasks" class="text-lg font-bold text-indigo-600"> Task Manager </NuxtLink>
      <div v-if="isAuthenticated" class="flex items-center gap-3 text-sm">
        <span class="text-gray-600" data-testid="current-user">{{ user?.displayName }}</span>
        <button
          type="button"
          class="rounded bg-gray-100 px-3 py-1 hover:bg-gray-200"
          data-testid="logout-button"
          @click="onLogout"
        >
          ログアウト
        </button>
      </div>
    </div>
  </header>
</template>
