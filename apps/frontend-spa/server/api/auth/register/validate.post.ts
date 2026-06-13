export default defineEventHandler(async (event) => {
  const body = await readBody<Record<string, unknown>>(event);
  // DryRun（検証のみ）。トークンは返らないので Cookie は設定しない。
  return forwardValidate('/auth/register/validate', body);
});
