export default defineEventHandler(async (event) => {
  const body = await readBody<Record<string, unknown>>(event);
  const tokens = await forwardAuth('/auth/register', body);
  setRefreshCookie(event, tokens.refreshToken);
  return { accessToken: tokens.accessToken, user: tokens.user };
});
