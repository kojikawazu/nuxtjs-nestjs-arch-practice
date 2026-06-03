/** Nuxt/$fetch のエラーからユーザー向けメッセージを取り出す。 */
export function getErrorMessage(e: unknown, fallback: string): string {
  const err = e as {
    statusMessage?: string;
    data?: { statusMessage?: string; message?: string };
  };
  return err?.data?.statusMessage ?? err?.data?.message ?? err?.statusMessage ?? fallback;
}
