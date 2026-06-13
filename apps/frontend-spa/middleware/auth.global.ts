const PUBLIC_PAGES = ['/login', '/register'];

/**
 * 未認証ユーザーを /login へ誘導するグローバルガード。
 * 認証済みユーザーが /login や /register を開いた場合は /tasks へ送る。
 */
export default defineNuxtRouteMiddleware((to) => {
  const { accessToken } = useAuthState();
  const isPublic = PUBLIC_PAGES.includes(to.path);

  if (accessToken.value === null && !isPublic) {
    return navigateTo('/login');
  }
  if (accessToken.value !== null && isPublic) {
    return navigateTo('/tasks');
  }
});
