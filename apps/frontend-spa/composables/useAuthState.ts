import type { User } from '@app/api-client';

/**
 * 認証状態（アクセストークン + ユーザー）をアプリ全体で共有する。
 * アクセストークンは「メモリ保持」= useState のみ（localStorage には置かない）。
 * リフレッシュトークンは Nitro BFF の httpOnly Cookie 側で管理する。
 */
export function useAuthState() {
  const accessToken = useState<string | null>('auth:accessToken', () => null);
  const user = useState<User | null>('auth:user', () => null);
  return { accessToken, user };
}
