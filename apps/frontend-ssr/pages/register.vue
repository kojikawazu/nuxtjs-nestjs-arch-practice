<script setup lang="ts">
const { register } = useAuth();

const email = ref('');
const password = ref('');
const displayName = ref('');
const error = ref<string | null>(null);
const loading = ref(false);

function currentInput() {
  return {
    email: email.value,
    password: password.value,
    displayName: displayName.value,
  };
}

// メール重複（409）などサーバ側の業務ルール違反は、この登録実行時に初めて分かる。
async function onSubmit() {
  error.value = null;
  loading.value = true;
  try {
    await register(currentInput());
    await navigateTo('/tasks');
  } catch (e) {
    error.value = getErrorMessage(e, '登録に失敗しました');
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="mx-auto max-w-sm">
    <h1 class="text-2xl font-bold">新規登録</h1>
    <form class="mt-6 space-y-4" data-testid="register-form" @submit.prevent="onSubmit">
      <input
        v-model="displayName"
        type="text"
        placeholder="表示名"
        data-testid="register-name"
        class="w-full rounded border border-gray-300 px-3 py-2"
      />
      <input
        v-model="email"
        type="email"
        placeholder="メールアドレス"
        data-testid="register-email"
        class="w-full rounded border border-gray-300 px-3 py-2"
      />
      <input
        v-model="password"
        type="password"
        placeholder="パスワード（8文字以上）"
        data-testid="register-password"
        class="w-full rounded border border-gray-300 px-3 py-2"
      />
      <p v-if="error" class="text-sm text-red-600" data-testid="register-error">{{ error }}</p>
      <button
        type="submit"
        :disabled="loading"
        data-testid="register-submit"
        class="w-full rounded bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        登録
      </button>
    </form>
    <p class="mt-4 text-sm text-gray-600">
      既にアカウントがある場合は
      <NuxtLink to="/login" class="text-indigo-600 underline">ログイン</NuxtLink>
    </p>
  </div>
</template>
