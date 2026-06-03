export default defineEventHandler(async (event) => {
  const refreshToken = getRefreshCookie(event);
  if (!refreshToken) {
    throw createError({ statusCode: 401, statusMessage: 'No refresh token' });
  }
  const tokens = await forwardAuth('/auth/refresh', { refreshToken });
  setRefreshCookie(event, tokens.refreshToken);
  return { accessToken: tokens.accessToken, user: tokens.user };
});
