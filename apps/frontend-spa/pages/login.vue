<script setup lang="ts">
const { login } = useAuth();

const email = ref('');
const password = ref('');
const error = ref<string | null>(null);
const loading = ref(false);

async function onSubmit() {
  error.value = null;
  loading.value = true;
  try {
    await login({ email: email.value, password: password.value });
    await navigateTo('/tasks');
  } catch (e) {
    error.value = getErrorMessage(e, 'ログインに失敗しました');
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="mx-auto max-w-sm">
    <h1 class="text-2xl font-bold">ログイン</h1>
    <form class="mt-6 space-y-4" data-testid="login-form" @submit.prevent="onSubmit">
      <input
        v-model="email"
        type="email"
        placeholder="メールアドレス"
        data-testid="login-email"
        class="w-full rounded border border-gray-300 px-3 py-2"
      />
      <input
        v-model="password"
        type="password"
        placeholder="パスワード"
        data-testid="login-password"
        class="w-full rounded border border-gray-300 px-3 py-2"
      />
      <p v-if="error" class="text-sm text-red-600" data-testid="login-error">{{ error }}</p>
      <button
        type="submit"
        :disabled="loading"
        data-testid="login-submit"
        class="w-full rounded bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        ログイン
      </button>
    </form>
    <p class="mt-4 text-sm text-gray-600">
      アカウントがない場合は
      <NuxtLink to="/register" class="text-indigo-600 underline">新規登録</NuxtLink>
    </p>
  </div>
</template>
