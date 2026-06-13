export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const authorization = getHeader(event, 'authorization');
  // backend 側のリフレッシュトークンも失効させる（失敗してもログアウトは続行）
  try {
    await $fetch(`${config.apiBaseUrl}/auth/logout`, {
      method: 'POST',
      headers: authorization ? { authorization } : {},
    });
  } catch {
    // ignore: ローカルのセッション破棄を優先する
  }
  clearRefreshCookie(event);
  return { ok: true };
});
